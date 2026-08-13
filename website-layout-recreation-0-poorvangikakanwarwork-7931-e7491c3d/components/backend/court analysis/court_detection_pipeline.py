# -*- coding: utf-8 -*-
"""
Badminton Court Detection & Player Zone Analytics Pipeline
============================================================

Given a match video and a top-down reference image of a badminton court,
this pipeline:

  1. Detects the court's four outer corners in the video's first frame
     (grayscale -> threshold -> Canny -> ROI crop -> connected components
     -> Hough lines -> outermost sideline tracking).
  2. Builds a homography that maps video pixels onto the reference image.
  3. Runs YOLO person detection over the video, classifies each detected
     person as the "top" or "bottom" player based on which half of the
     court their feet land in, and builds a discrete-square heatmap for
     each player.
  4. Buckets every tracked point into a 4x4 (16-zone) grid per player and
     reports how much time each player spent in each zone.
  5. Renders zone-map visualizations (per player and combined).

Originally an exploratory Colab notebook (interactive file-upload widgets,
inline plotting, several redundant copy-pasted cells). This version is a
straight functional port for server-side / backend use: no Colab imports,
no interactive upload prompts, and no duplicate blocks. Every image the
notebook used to `plt.show()` is now written to disk instead. The image
that used to be uploaded via `files.upload()` in the notebook is now
expected to already exist on disk (e.g. placed there by the backend
before this pipeline runs) and is passed in as `ref_image_path`.

No detection, geometry, or zone-classification math was changed from the
original notebook — this is a structural cleanup only.

CLI usage:
    python court_detection_pipeline.py \\
        --video match.mp4 \\
        --ref-image court_reference.png \\
        --output-dir output

Programmatic usage:
    from court_detection_pipeline import run_pipeline
    result = run_pipeline("match.mp4", "court_reference.png", "output")
"""

import argparse
import json
import os

import cv2 as cv
import matplotlib

matplotlib.use("Agg")  # no display available on a backend/server
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from tqdm import tqdm
from ultralytics import YOLO

# ============================================================================
# Configuration
# ============================================================================
DEFAULT_YOLO_MODEL = "yolov8n.pt"
PERSON_CLASS_ID = 0
DETECTION_CONF = 0.35

# Court-detection tuning
CANNY_SIGMA = 0.33
BRIGHT_THRESH = 190
ROI_TOP_FRAC = 0.30      # blacks out scoreboard / crowd
ROI_BOTTOM_FRAC = 0.97   # blacks out caption bar
ROI_LEFT_FRAC = 0.03
ROI_RIGHT_FRAC = 0.97
SIDELINE_MIN_ANGLE = 25
SIDELINE_MAX_ANGLE = 155
OUTER_LINE_TOLERANCE_PX = 30

# Player-tracking tuning
SQUARE_SIZE = 12
MAX_VISITS = 20.0
TOP_COLOR_BGR = (2, 95, 217)       # orange
BOTTOM_COLOR_BGR = (189, 130, 49)  # blue


# ============================================================================
# Geometry helpers
# ============================================================================
def _line_coords(line):
    line_arr = np.asarray(line)
    if line_arr.ndim == 1 and line_arr.size == 4:
        return tuple(line_arr.tolist())
    if line_arr.ndim == 2 and line_arr.shape == (1, 4):
        return tuple(line_arr[0].tolist())
    if line_arr.ndim == 3 and line_arr.shape == (1, 1, 4):
        return tuple(line_arr[0][0].tolist())
    raise ValueError(f"Unexpected line format: shape={line_arr.shape}, dtype={line_arr.dtype}")


def line_angle(line):
    x1, y1, x2, y2 = _line_coords(line)
    return np.degrees(np.arctan2(y2 - y1, x2 - x1)) % 180


def line_length(line):
    x1, y1, x2, y2 = _line_coords(line)
    return np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def line_y_center(line):
    x1, y1, x2, y2 = _line_coords(line)
    return (y1 + y2) / 2


def line_x_center(line):
    x1, y1, x2, y2 = _line_coords(line)
    return (x1 + x2) / 2


def line_to_abc(line):
    x1, y1, x2, y2 = _line_coords(line)
    a = y2 - y1
    b = x1 - x2
    c = (x2 - x1) * y1 - (y2 - y1) * x1
    return np.array([a, b, -c], dtype=float)


def intersect(l1, l2):
    """Intersection point of two lines given in HoughLinesP segment form."""
    a1, b1, c1 = line_to_abc(l1)
    a2, b2, c2 = line_to_abc(l2)
    det = a1 * b2 - a2 * b1
    if abs(det) < 1e-6:
        return None
    x = (c1 * b2 - c2 * b1) / det
    y = (a1 * c2 - a2 * c1) / det
    return (int(round(x)), int(round(y)))


def x_at_bottom(line, h):
    """X coordinate where a line segment (extended) crosses y = h."""
    x1, y1, x2, y2 = _line_coords(line)
    if y2 == y1:
        return x1
    return x1 + (h - y1) * (x2 - x1) / (y2 - y1)


def get_extreme_endpoints(line_group):
    """Given a group of line segments, return the topmost and bottommost point."""
    points = []
    for l in line_group:
        x1, y1, x2, y2 = _line_coords(l)
        points.extend([(x1, y1), (x2, y2)])
    points.sort(key=lambda p: p[1])  # sort by Y (0 = top of image)
    return points[0], points[-1]     # top_point, bottom_point


# ============================================================================
# Step 1 — Court detection
# ============================================================================
def extract_first_frame(video_path):
    if not os.path.isfile(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    cap = cv.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video file: {video_path}")
    success, frame = cap.read()
    cap.release()
    if not success or frame is None:
        raise RuntimeError(f"Could not read a frame from video: {video_path}")
    return frame


def detect_court_mask(frame, save_debug_dir=None):
    """Isolate the court's line pixels: grayscale -> bright threshold -> Canny
    -> crop out scoreboard/edges -> keep only the largest connected component."""
    gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
    _, bright = cv.threshold(gray, BRIGHT_THRESH, 255, cv.THRESH_BINARY)

    v = np.median(gray)
    lower = int(max(0, (1.0 - CANNY_SIGMA) * v))
    upper = int(min(255, (1.0 + CANNY_SIGMA) * v))
    edges = cv.Canny(bright, lower, upper, apertureSize=3)

    h, w = edges.shape[:2]
    edges_roi = edges.copy()
    edges_roi[: int(h * ROI_TOP_FRAC), :] = 0
    edges_roi[int(h * ROI_BOTTOM_FRAC):, :] = 0
    edges_roi[:, : int(w * ROI_LEFT_FRAC)] = 0
    edges_roi[:, int(w * ROI_RIGHT_FRAC):] = 0

    _, binary = cv.threshold(edges_roi, 30, 255, cv.THRESH_BINARY)
    kernel = np.ones((5, 5), np.uint8)
    dilated = cv.dilate(binary, kernel, iterations=2)

    num_labels, labels, stats, _ = cv.connectedComponentsWithStats(dilated, connectivity=8)
    areas = [(i, stats[i, cv.CC_STAT_AREA]) for i in range(1, num_labels)]
    if not areas:
        raise RuntimeError("No connected components found while isolating the court.")
    areas.sort(key=lambda x: -x[1])
    court_label = areas[0][0]
    print(f"Total components: {num_labels - 1} | Largest (court) area: {areas[0][1]} px²")

    court_mask = (labels == court_label).astype(np.uint8) * 255
    court_only = cv.bitwise_and(binary, binary, mask=court_mask)

    if save_debug_dir:
        os.makedirs(save_debug_dir, exist_ok=True)
        cv.imwrite(os.path.join(save_debug_dir, "01_grayscale.png"), gray)
        cv.imwrite(os.path.join(save_debug_dir, "02_canny_edges.png"), edges)
        cv.imwrite(os.path.join(save_debug_dir, "03_edges_roi.png"), edges_roi)
        cv.imwrite(os.path.join(save_debug_dir, "04_court_only.png"), court_only)

    return court_only


def detect_court_corners(frame, court_mask, save_debug_dir=None):
    """Hough-transform the cleaned court mask and track the outermost left/right
    sidelines to recover the four court corners (TL, TR, BL, BR)."""
    frame_h, frame_w = frame.shape[:2]
    img_center_x = frame_w / 2

    lines = cv.HoughLinesP(court_mask, 1, np.pi / 180, threshold=40, minLineLength=50, maxLineGap=20)
    if lines is None:
        raise RuntimeError("No lines detected in the court mask.")

    # Drop near-horizontal lines (net, baselines) — keep sidelines only
    sidelines = [l for l in lines if SIDELINE_MIN_ANGLE < line_angle(l) < SIDELINE_MAX_ANGLE]

    left_lines = [l for l in sidelines if line_x_center(l) < img_center_x]
    right_lines = [l for l in sidelines if line_x_center(l) > img_center_x]
    if not left_lines or not right_lines:
        raise RuntimeError("Could not detect both left and right sidelines.")

    # Isolate the outermost line on each side (by where it meets the bottom edge)
    left_lines.sort(key=lambda l: x_at_bottom(l, frame_h))
    min_left_x = x_at_bottom(left_lines[0], frame_h)
    outer_left_lines = [l for l in left_lines if abs(x_at_bottom(l, frame_h) - min_left_x) < OUTER_LINE_TOLERANCE_PX]

    right_lines.sort(key=lambda l: x_at_bottom(l, frame_h), reverse=True)
    max_right_x = x_at_bottom(right_lines[0], frame_h)
    outer_right_lines = [l for l in right_lines if abs(x_at_bottom(l, frame_h) - max_right_x) < OUTER_LINE_TOLERANCE_PX]

    tl, bl = get_extreme_endpoints(outer_left_lines)
    tr, br = get_extreme_endpoints(outer_right_lines)

    print("Perfect court corners:")
    print(f"  TL: {tl}  TR: {tr}  BL: {bl}  BR: {br}")

    if save_debug_dir:
        os.makedirs(save_debug_dir, exist_ok=True)
        result = frame.copy()
        for l in outer_left_lines + outer_right_lines:
            x1, y1, x2, y2 = _line_coords(l)
            cv.line(result, (x1, y1), (x2, y2), (255, 0, 0), 3)

        poly = np.array([tl, tr, br, bl], dtype=np.int32)
        cv.polylines(result, [poly.reshape(-1, 1, 2)], True, (0, 255, 255), 3)

        corner_info = {
            "TL": ((0, 255, 80), tl, (-80, -30)),
            "TR": ((0, 255, 255), tr, (10, -30)),
            "BL": ((255, 160, 0), bl, (-80, 35)),
            "BR": ((100, 100, 255), br, (10, 35)),
        }
        for name, (color, pt, offset) in corner_info.items():
            px, py = int(pt[0]), int(pt[1])
            cv.circle(result, (px, py), 14, color, -1)
            cv.circle(result, (px, py), 14, (255, 255, 255), 2)
            tpos = (max(5, px + offset[0]), max(15, min(frame_h - 5, py + offset[1])))
            cv.putText(result, name, tpos, cv.FONT_HERSHEY_SIMPLEX, 0.75, color, 2)
            cv.putText(result, f"({pt[0]},{pt[1]})", (tpos[0], tpos[1] + 20),
                       cv.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        cv.imwrite(os.path.join(save_debug_dir, "05_court_corners.png"), result)

    return {"tl": tl, "tr": tr, "bl": bl, "br": br}


# ============================================================================
# Step 2 — Homography (video -> top-down reference court)
# ============================================================================
def build_homography(corners, ref_img, frame_height):
    ref_h, ref_w = ref_img.shape[:2]
    map_h = frame_height
    map_w = int(ref_w * (frame_height / ref_h))
    ref_resized = cv.resize(ref_img, (map_w, map_h))

    video_pts = np.array([corners["tl"], corners["tr"], corners["br"], corners["bl"]], dtype=np.float32)
    map_pts = np.array([[0, 0], [map_w, 0], [map_w, map_h], [0, map_h]], dtype=np.float32)
    H, _ = cv.findHomography(video_pts, map_pts)
    return H, ref_resized, map_w, map_h


# ============================================================================
# Step 3 — Player tracking (YOLO + discrete-square heatmap)
# ============================================================================
def track_players(video_path, model, H, ref_resized, map_w, map_h, output_video_path=None):
    """Single pass over the video: detect people with YOLO, project their foot
    position onto the reference court via the homography, classify each as the
    top-half or bottom-half player, and accumulate a discrete-square heatmap
    for each. Optionally writes a side-by-side annotated + heatmap video."""
    cap = cv.VideoCapture(video_path)
    width = int(cap.get(cv.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv.CAP_PROP_FPS)
    total_frames = int(cap.get(cv.CAP_PROP_FRAME_COUNT))

    out = None
    if output_video_path:
        fourcc = cv.VideoWriter_fourcc(*"avc1")
        out = cv.VideoWriter(output_video_path, fourcc, fps, (width + map_w, height))
        if not out.isOpened():
            print(f"Warning: video writer failed to open with fourcc=avc1 for {output_video_path}")
            fourcc = cv.VideoWriter_fourcc(*"mp4v")
            out = cv.VideoWriter(output_video_path, fourcc, fps, (width + map_w, height))
            if not out.isOpened():
                raise RuntimeError(f"Failed to open VideoWriter for {output_video_path} with both avc1 and mp4v")

    acc_top = np.zeros((map_h, map_w), dtype=np.float32)
    acc_bot = np.zeros((map_h, map_w), dtype=np.float32)
    top_layer = np.full((map_h, map_w, 3), TOP_COLOR_BGR, dtype=np.float32)
    bot_layer = np.full((map_h, map_w, 3), BOTTOM_COLOR_BGR, dtype=np.float32)

    top_player_pts = []
    bottom_player_pts = []

    with tqdm(total=total_frames, desc="Tracking players") as pbar:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            results = model(frame, classes=[PERSON_CLASS_ID], conf=DETECTION_CONF, verbose=False)

            players = []
            for box in results[0].boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                foot_x, foot_y = (x1 + x2) / 2, y2

                map_pt = cv.perspectiveTransform(np.array([[[foot_x, foot_y]]], dtype=np.float32), H)
                mx, my = int(map_pt[0][0][0]), int(map_pt[0][0][1])

                if 0 <= mx < map_w and 0 <= my < map_h:
                    if my < map_h / 2:
                        top_player_pts.append((mx, my))
                        players.append({"mx": mx, "my": my, "box": (int(x1), int(y1), int(x2), int(y2)),
                                         "col": TOP_COLOR_BGR})
                        acc_top[max(0, my - SQUARE_SIZE):min(map_h, my + SQUARE_SIZE),
                                max(0, mx - SQUARE_SIZE):min(map_w, mx + SQUARE_SIZE)] += 1.0
                    else:
                        bottom_player_pts.append((mx, my))
                        players.append({"mx": mx, "my": my, "box": (int(x1), int(y1), int(x2), int(y2)),
                                         "col": BOTTOM_COLOR_BGR})
                        acc_bot[max(0, my - SQUARE_SIZE):min(map_h, my + SQUARE_SIZE),
                                max(0, mx - SQUARE_SIZE):min(map_w, mx + SQUARE_SIZE)] += 1.0

            if out is not None:
                viz_map = ref_resized.astype(np.float32)
                top_alpha = np.expand_dims(np.clip(acc_top / MAX_VISITS, 0, 0.85), -1)
                bot_alpha = np.expand_dims(np.clip(acc_bot / MAX_VISITS, 0, 0.85), -1)
                viz_map = viz_map * (1 - top_alpha) + top_layer * top_alpha
                viz_map = viz_map * (1 - bot_alpha) + bot_layer * bot_alpha

                for p in players:
                    cv.circle(viz_map, (p["mx"], p["my"]), 10, p["col"], -1)
                    cv.circle(viz_map, (p["mx"], p["my"]), 10, (255, 255, 255), 2)
                    cv.rectangle(frame, p["box"][:2], p["box"][2:], p["col"], 2)

                out.write(np.hstack((frame, viz_map.astype(np.uint8))))

            pbar.update(1)

    cap.release()
    if out is not None:
        out.release()

    print(f"Done tracking: {len(bottom_player_pts)} bottom points, {len(top_player_pts)} top points.")
    return {"top_player_pts": top_player_pts, "bottom_player_pts": bottom_player_pts}


# ============================================================================
# Step 4 — 16-zone classification per player
# ============================================================================
def compute_zone_counts_bottom(points, map_h, map_w):
    """Bottom-half player: Y grows LARGER moving away from the net."""
    net_y = map_h / 2
    row1 = net_y + (map_h - net_y) * 0.25
    row2 = net_y + (map_h - net_y) * 0.50
    row3 = net_y + (map_h - net_y) * 0.75
    col1, col2, col3 = map_w * 0.25, map_w * 0.50, map_w * 0.75

    counts = {i: 0 for i in range(1, 17)}
    for mx, my in points:
        col_idx = 0 if mx < col1 else 1 if mx < col2 else 2 if mx < col3 else 3
        if my < row1:
            row_idx = 0
        elif my < row2:
            row_idx = 1
        elif my < row3:
            row_idx = 2
        else:
            row_idx = 3
        counts[row_idx * 4 + col_idx + 1] += 1

    bounds = {"net_y": net_y, "row1": row1, "row2": row2, "row3": row3, "col1": col1, "col2": col2, "col3": col3}
    return counts, bounds


def compute_zone_counts_top(points, map_h, map_w):
    """Top-half player: Y grows SMALLER moving away from the net."""
    net_y = map_h / 2
    row1 = net_y - net_y * 0.25
    row2 = net_y - net_y * 0.50
    row3 = net_y - net_y * 0.75
    col1, col2, col3 = map_w * 0.25, map_w * 0.50, map_w * 0.75

    counts = {i: 0 for i in range(1, 17)}
    for mx, my in points:
        col_idx = 0 if mx < col1 else 1 if mx < col2 else 2 if mx < col3 else 3
        if my >= row1:
            row_idx = 0
        elif my >= row2:
            row_idx = 1
        elif my >= row3:
            row_idx = 2
        else:
            row_idx = 3
        counts[row_idx * 4 + col_idx + 1] += 1

    bounds = {"net_y": net_y, "row1": row1, "row2": row2, "row3": row3, "col1": col1, "col2": col2, "col3": col3}
    return counts, bounds


def zone_report(counts, label):
    """Build (and print) a percentage-per-zone report. Returns the DataFrame."""
    total = sum(counts.values())
    print(f"{label} ZONES (based on {total} tracked frames):")
    if total == 0:
        print("No data points found.")
        return None

    df = pd.DataFrame([{"Zone": f"Zone {z}", "Percentage": f"{(c / total * 100):.1f}%"} for z, c in counts.items()])
    print(df.to_string(index=False))
    most_visited = max(counts, key=counts.get)
    print(f"{label.title()} spent the most time in Zone {most_visited}")
    return df


# ============================================================================
# Step 5 — Zone-map visualizations
# ============================================================================
def _draw_zone_numbers(graph, x_centers, y_centers, color=(255, 255, 255)):
    zone_num = 1
    for y in y_centers:
        for x in x_centers:
            cv.putText(graph, str(zone_num), (x - 15, y + 15), cv.FONT_HERSHEY_SIMPLEX, 1.0, color, 3)
            zone_num += 1


def draw_zone_graph_bottom(ref_resized, points, bounds, map_h, map_w, save_path=None):
    graph = ref_resized.copy()
    cv.line(graph, (0, int(bounds["row1"])), (map_w, int(bounds["row1"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(bounds["row2"])), (map_w, int(bounds["row2"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(bounds["row3"])), (map_w, int(bounds["row3"])), (255, 255, 255), 2)
    cv.line(graph, (int(bounds["col1"]), int(bounds["net_y"])), (int(bounds["col1"]), map_h), (0, 0, 0), 6)
    cv.line(graph, (int(bounds["col2"]), int(bounds["net_y"])), (int(bounds["col2"]), map_h), (255, 255, 255), 2)
    cv.line(graph, (int(bounds["col3"]), int(bounds["net_y"])), (int(bounds["col3"]), map_h), (0, 0, 0), 6)

    for mx, my in points:
        cv.circle(graph, (mx, my), 4, (0, 0, 0), -1)

    y_centers = [
        int(bounds["net_y"] + (bounds["row1"] - bounds["net_y"]) / 2),
        int(bounds["row1"] + (bounds["row2"] - bounds["row1"]) / 2),
        int(bounds["row2"] + (bounds["row3"] - bounds["row2"]) / 2),
        int(bounds["row3"] + (map_h - bounds["row3"]) / 2),
    ]
    x_centers = [
        int(bounds["col1"] / 2),
        int(bounds["col1"] + (bounds["col2"] - bounds["col1"]) / 2),
        int(bounds["col2"] + (bounds["col3"] - bounds["col2"]) / 2),
        int(bounds["col3"] + (map_w - bounds["col3"]) / 2),
    ]
    _draw_zone_numbers(graph, x_centers, y_centers)

    if save_path:
        cv.imwrite(save_path, graph)
    return graph


def draw_zone_graph_top(ref_resized, points, bounds, map_h, map_w, save_path=None):
    graph = ref_resized.copy()
    cv.line(graph, (0, int(bounds["row1"])), (map_w, int(bounds["row1"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(bounds["row2"])), (map_w, int(bounds["row2"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(bounds["row3"])), (map_w, int(bounds["row3"])), (255, 255, 255), 2)
    cv.line(graph, (int(bounds["col1"]), 0), (int(bounds["col1"]), int(bounds["net_y"])), (0, 0, 0), 6)
    cv.line(graph, (int(bounds["col2"]), 0), (int(bounds["col2"]), int(bounds["net_y"])), (255, 255, 255), 2)
    cv.line(graph, (int(bounds["col3"]), 0), (int(bounds["col3"]), int(bounds["net_y"])), (0, 0, 0), 6)

    for mx, my in points:
        cv.circle(graph, (mx, my), 4, (0, 0, 0), -1)

    y_centers = [
        int(bounds["net_y"] - (bounds["net_y"] - bounds["row1"]) / 2),
        int(bounds["row1"] - (bounds["row1"] - bounds["row2"]) / 2),
        int(bounds["row2"] - (bounds["row2"] - bounds["row3"]) / 2),
        int(bounds["row3"] / 2),
    ]
    x_centers = [
        int(bounds["col1"] / 2),
        int(bounds["col1"] + (bounds["col2"] - bounds["col1"]) / 2),
        int(bounds["col2"] + (bounds["col3"] - bounds["col2"]) / 2),
        int(bounds["col3"] + (map_w - bounds["col3"]) / 2),
    ]
    _draw_zone_numbers(graph, x_centers, y_centers)

    if save_path:
        cv.imwrite(save_path, graph)
    return graph


def draw_full_court_graph(ref_resized, top_points, bot_points, top_bounds, bot_bounds, map_h, map_w, save_path=None):
    graph = ref_resized.copy()

    cv.line(graph, (0, int(top_bounds["row1"])), (map_w, int(top_bounds["row1"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(top_bounds["row2"])), (map_w, int(top_bounds["row2"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(top_bounds["row3"])), (map_w, int(top_bounds["row3"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(bot_bounds["row1"])), (map_w, int(bot_bounds["row1"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(bot_bounds["row2"])), (map_w, int(bot_bounds["row2"])), (255, 255, 255), 2)
    cv.line(graph, (0, int(bot_bounds["row3"])), (map_w, int(bot_bounds["row3"])), (255, 255, 255), 2)

    col1, col2, col3 = top_bounds["col1"], top_bounds["col2"], top_bounds["col3"]
    cv.line(graph, (int(col1), 0), (int(col1), map_h), (0, 0, 0), 6)
    cv.line(graph, (int(col2), 0), (int(col2), map_h), (255, 255, 255), 2)
    cv.line(graph, (int(col3), 0), (int(col3), map_h), (0, 0, 0), 6)

    for mx, my in top_points:
        cv.circle(graph, (mx, my), 4, TOP_COLOR_BGR, -1)
    for mx, my in bot_points:
        cv.circle(graph, (mx, my), 4, BOTTOM_COLOR_BGR, -1)

    x_centers = [
        int(col1 / 2),
        int(col1 + (col2 - col1) / 2),
        int(col2 + (col3 - col2) / 2),
        int(col3 + (map_w - col3) / 2),
    ]
    y_centers_top = [
        int(top_bounds["net_y"] - (top_bounds["net_y"] - top_bounds["row1"]) / 2),
        int(top_bounds["row1"] - (top_bounds["row1"] - top_bounds["row2"]) / 2),
        int(top_bounds["row2"] - (top_bounds["row2"] - top_bounds["row3"]) / 2),
        int(top_bounds["row3"] / 2),
    ]
    y_centers_bot = [
        int(bot_bounds["net_y"] + (bot_bounds["row1"] - bot_bounds["net_y"]) / 2),
        int(bot_bounds["row1"] + (bot_bounds["row2"] - bot_bounds["row1"]) / 2),
        int(bot_bounds["row2"] + (bot_bounds["row3"] - bot_bounds["row2"]) / 2),
        int(bot_bounds["row3"] + (map_h - bot_bounds["row3"]) / 2),
    ]

    font = cv.FONT_HERSHEY_SIMPLEX

    def draw_numbers(y_list, color):
        zone_num = 1
        for y in y_list:
            for x in x_centers:
                text_size = cv.getTextSize(str(zone_num), font, 1.2, 3)[0]
                tx = x - (text_size[0] // 2)
                ty = y + (text_size[1] // 2)
                cv.putText(graph, str(zone_num), (tx, ty), font, 1.2, color, 3)
                zone_num += 1

    draw_numbers(y_centers_top, (255, 255, 255))
    draw_numbers(y_centers_bot, (255, 255, 255))

    if save_path:
        cv.imwrite(save_path, graph)
    return graph


# ============================================================================
# Orchestration
# ============================================================================
def run_pipeline(video_path, ref_image_path, output_dir="output",
                  yolo_model_path=DEFAULT_YOLO_MODEL,
                  save_debug_images=True, save_annotated_video=True):
    """Run the full court-detection + player-zone-analytics pipeline.

    Args:
        video_path: path to the match video (backend already saved it to disk).
        ref_image_path: path to the top-down reference court image
            (backend already saved it to disk — no interactive upload here).
        output_dir: directory to write all outputs into.
        yolo_model_path: YOLO weights to use for person detection.
        save_debug_images: if True, saves the intermediate court-detection
            visualizations (grayscale, edges, mask, corners) for debugging.
        save_annotated_video: if True, writes a side-by-side
            annotated-video + live-heatmap .mp4 (this is the slowest step).

    Returns:
        dict with corners, per-player tracked points, zone counts, and
        the output directory.
    """
    if not os.path.isfile(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")
    if not os.path.isfile(ref_image_path):
        raise FileNotFoundError(f"Reference image file not found: {ref_image_path}")

    os.makedirs(output_dir, exist_ok=True)
    debug_dir = os.path.join(output_dir, "debug") if save_debug_images else None

    print("Extracting first frame...")
    frame = extract_first_frame(video_path)

    print("Detecting court...")
    court_mask = detect_court_mask(frame, save_debug_dir=debug_dir)
    corners = detect_court_corners(frame, court_mask, save_debug_dir=debug_dir)

    ref_img = cv.imread(ref_image_path)
    if ref_img is None:
        raise RuntimeError(f"Could not read reference image: {ref_image_path}")

    frame_h = frame.shape[0]
    H, ref_resized, map_w, map_h = build_homography(corners, ref_img, frame_h)

    print("Loading YOLO model...")
    model = YOLO(yolo_model_path)

    video_out_path = os.path.join(output_dir, "tracked_heatmap.mp4") if save_annotated_video else None
    print("Tracking players...")
    tracking = track_players(video_path, model, H, ref_resized, map_w, map_h, output_video_path=video_out_path)
    top_pts = tracking["top_player_pts"]
    bot_pts = tracking["bottom_player_pts"]

    with open(os.path.join(output_dir, "top_player_data.json"), "w") as f:
        json.dump(top_pts, f)
    with open(os.path.join(output_dir, "bottom_player_data.json"), "w") as f:
        json.dump(bot_pts, f)

    bot_counts, bot_bounds = compute_zone_counts_bottom(bot_pts, map_h, map_w)
    top_counts, top_bounds = compute_zone_counts_top(top_pts, map_h, map_w)
    zone_report(bot_counts, "BOTTOM PLAYER")
    zone_report(top_counts, "TOP PLAYER")

    draw_zone_graph_bottom(ref_resized, bot_pts, bot_bounds, map_h, map_w,
                            save_path=os.path.join(output_dir, "bottom_player_16_zone_map.png"))
    draw_zone_graph_top(ref_resized, top_pts, top_bounds, map_h, map_w,
                         save_path=os.path.join(output_dir, "top_player_16_zone_map.png"))
    draw_full_court_graph(ref_resized, top_pts, bot_pts, top_bounds, bot_bounds, map_h, map_w,
                           save_path=os.path.join(output_dir, "full_court_32_zone_map.png"))

    summary = {
        "corners": corners,
        "top_player_pts": top_pts,
        "bottom_player_pts": bot_pts,
        "top_zone_counts": top_counts,
        "bottom_zone_counts": bot_counts,
        "top_zone_percentages": _normalize_zone_percentages(top_counts),
        "bottom_zone_percentages": _normalize_zone_percentages(bot_counts),
        "output_dir": output_dir,
        "output_files": {
            "top_zone_map": os.path.join(output_dir, "top_player_16_zone_map.png"),
            "bottom_zone_map": os.path.join(output_dir, "bottom_player_16_zone_map.png"),
            "full_court_map": os.path.join(output_dir, "full_court_32_zone_map.png"),
        },
    }

    with open(os.path.join(output_dir, "analysis_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    print(f"Pipeline complete. Outputs saved to: {output_dir}")
    return summary


def _normalize_zone_percentages(counts):
    total = sum(counts.values())
    if total == 0:
        return {str(zone): 0.0 for zone in counts}
    return {str(zone): round((value / total) * 100.0, 2) for zone, value in counts.items()}


def main():
    parser = argparse.ArgumentParser(description="Badminton court detection & player zone analytics")
    parser.add_argument("--video", required=True, help="Path to the input match video")
    parser.add_argument("--ref-image", required=True, help="Path to the reference (top-down) court image")
    parser.add_argument("--output-dir", default="output", help="Directory to write outputs to")
    parser.add_argument("--yolo-model", default=DEFAULT_YOLO_MODEL, help="YOLO weights to use for person detection")
    parser.add_argument("--no-video", action="store_true", help="Skip writing the annotated heatmap video")
    parser.add_argument("--no-debug", action="store_true", help="Skip saving intermediate debug images")
    args = parser.parse_args()

    run_pipeline(
        video_path=args.video,
        ref_image_path=args.ref_image,
        output_dir=args.output_dir,
        yolo_model_path=args.yolo_model,
        save_debug_images=not args.no_debug,
        save_annotated_video=not args.no_video,
    )


if __name__ == "__main__":
    main()

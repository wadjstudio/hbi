"""Review aids only: jersey colour groups and frame-bound court calibration."""
import numpy as np


def jersey_colour(image, box):
    """Torso interior HSV heuristic. Colour does not establish team or player identity."""
    x1, y1, x2, y2 = map(float, box)
    width, height = x2 - x1, y2 - y1
    if not np.isfinite([x1, y1, x2, y2]).all() or width < 8 or height < 16:
        return {"group": "unknown", "support": 0.0}
    bounds = (max(0, int(x1 + width * .25)), max(0, int(y1 + height * .18)), min(image.width, int(x2 - width * .25)), min(image.height, int(y1 + height * .55)))
    if bounds[2] - bounds[0] < 3 or bounds[3] - bounds[1] < 3:
        return {"group": "unknown", "support": 0.0}
    crop = image.crop(bounds)
    hsv = np.asarray(crop.convert("HSV"), dtype=float) / 255
    hue, sat, value = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    visible = value > .18
    masks = {
        "red": ((hue < .045) | (hue > .95)) & (sat > .5) & visible,
        "white": (sat < .22) & (value > .62),
        "green": (hue > .22) & (hue < .46) & (sat > .4) & visible,
        "cyan": (hue >= .46) & (hue < .58) & (sat > .4) & visible,
    }
    ranked = sorted(((float(mask.mean()), name) for name, mask in masks.items()), reverse=True)
    support, group = ranked[0]
    if support < .35 or support - ranked[1][0] < .15:
        group = "unknown"
    return {"group": group, "support": round(support, 4)}


def court_homography(image_points, court_points):
    """Exactly four reviewed ground correspondences, valid for this image only.

    Image points are normalised; court coordinates are metres on a 40 x 20 court.
    Does not calibrate camera motion or project airborne players / the ball.
    """
    image = np.asarray(image_points, dtype=float)
    court = np.asarray(court_points, dtype=float)
    if image.shape != (4, 2) or court.shape != (4, 2) or not np.isfinite(image).all() or not np.isfinite(court).all():
        raise ValueError("Four finite ground correspondences are required")
    if (image < 0).any() or (image > 1).any() or (court < 0).any() or (court > [40, 20]).any():
        raise ValueError("Coordinates outside image or court")
    for points in (image, court):
        for omitted in range(4):
            triangle = np.delete(points, omitted, axis=0)
            a, b = triangle[1] - triangle[0], triangle[2] - triangle[0]
            if abs(a[0] * b[1] - a[1] * b[0]) < 1e-5:
                raise ValueError("Coincident or collinear calibration anchors")
    rows, values = [], []
    for (x, y), (u, v) in zip(image, court):
        rows.extend([[x, y, 1, 0, 0, 0, -u*x, -u*y], [0, 0, 0, x, y, 1, -v*x, -v*y]])
        values.extend([u, v])
    matrix = np.asarray(rows)
    if np.linalg.cond(matrix) > 1e9:
        raise ValueError("Unstable court calibration")
    h = np.append(np.linalg.solve(matrix, values), 1).reshape(3, 3)
    # A projective horizon inside the calibrated quadrilateral is invalid.
    denominators = np.column_stack([image, np.ones(4)]) @ h[2]
    if not ((denominators > 1e-8).all() or (denominators < -1e-8).all()):
        raise ValueError("Calibration crosses the projective horizon")
    return h

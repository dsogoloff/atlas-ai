# Generates the 3 CLICK_IMAGE_SINGLE tiles for SAM-L0A-Q15 ("Tap the bowl on the
# bottom shelf"). Source has two crops: an empty 3-shelf rack (0A-15_2) and a single
# bowl (0A-15_1). We composite the bowl onto ONE shelf per tile so each tile shows
# the rack with a bowl on the top / middle / bottom shelf; the child taps the tile
# whose bowl is on the BOTTOM shelf (t3 = correct). Same compositing pattern as
# gen_l0b_q07_stimulus.py. GENERATED; output -> scripts/conversion/source/0a/.
#
# Re-run: python scripts/conversion/gen_l0a_q15_tiles.py

from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "source", "0a")
RACK = os.path.join(SRC_DIR, "0A-15_2.png")
BOWL = os.path.join(SRC_DIR, "0A-15_1.png")

# Bottom edge (floor) of each shelf compartment as a fraction of rack height,
# top -> middle -> bottom. The bowl rests with its base just above each floor line.
FLOORS = [0.335, 0.665, 0.985]
BOWL_W_FRAC = 0.34  # bowl width as a fraction of rack width


def make(floor_frac: float, out_name: str) -> None:
    rack = Image.open(RACK).convert("RGBA")
    bowl = Image.open(BOWL).convert("RGBA")
    W, H = rack.size
    bw = int(W * BOWL_W_FRAC)
    ratio = bw / bowl.width
    bowl = bowl.resize((bw, max(1, round(bowl.height * ratio))), Image.LANCZOS)
    # Flatten onto white so the rack's transparent interior doesn't go black.
    canvas = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    canvas.alpha_composite(rack)
    x = (W - bowl.width) // 2
    y = int(H * floor_frac) - bowl.height  # base sits on the floor line
    canvas.alpha_composite(bowl, (x, max(0, y)))
    canvas.convert("RGB").save(os.path.join(SRC_DIR, out_name), "PNG")
    print(f"wrote {out_name} (bowl {bowl.width}x{bowl.height} at y={y} on {W}x{H} rack)")


def main() -> None:
    make(FLOORS[0], "sam-l0a-q15-t1.png")  # top shelf
    make(FLOORS[1], "sam-l0a-q15-t2.png")  # middle shelf
    make(FLOORS[2], "sam-l0a-q15-t3.png")  # bottom shelf (correct)


if __name__ == "__main__":
    main()

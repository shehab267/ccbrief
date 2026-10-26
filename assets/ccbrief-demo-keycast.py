#!/usr/bin/env python3
"""Keycast for the README demo GIF. Not part of ccbrief.

Runs a command in a pseudo-terminal and, whenever a key that does something in the
picker is pressed, draws that key as a badge on the right-hand side of the screen
(like KeyCastr / screenkey). Arrow keys and Space are otherwise invisible in a
recording, so a viewer can't tell what moved the cursor or toggled a segment.

The badge is drawn by this wrapper, never by ccbrief, so the picker in the GIF is
the real one, byte for byte. Usage: python3 ccbrief-demo-keycast.py npx ccbrief config
"""
import fcntl
import os
import select
import sys
import termios
import time
import tty

# Only keys the picker acts on. Anything else passes through without a badge.
KEYS = {
    b'\x1b[A': ('↑', 'move'),
    b'\x1b[B': ('↓', 'move'),
    b'\x1b[D': ('←', 'reorder'),
    b'\x1b[C': ('→', 'reorder'),
    b' ': ('space', 'show / hide'),
    b'\r': ('↵ enter', 'save'),
    b'p': ('p', 'preset'),
    b'y': ('y', 'symbols'),
    b'c': ('c', 'colors'),
    b'i': ('i', 'icons'),
    b'l': ('l', 'layout'),
    b'd': ('d', 'diff'),
    b's': ('s', 'save'),
    b'q': ('q', 'quit'),
    b'\x1b': ('esc', 'quit'),
}
SAVE_KEYS = {b'\r', b's', b'q', b'\x1b'}

SHOW_FOR = 1.3     # seconds a badge stays up after the last press
HOLD_ON_EXIT = 0.9 # let the viewer read "save" before the picker closes
BOX = 18           # badge width in columns
TOP = 9            # badge row: beside the segment list
ACCENT = '\x1b[38;5;244m'   # plain greys: the badge should not compete with the UI
KEYCAP = '\x1b[1m'
DIM = '\x1b[38;5;246m'
RESET = '\x1b[0m'


def winsize(fd):
    return fcntl.ioctl(fd, termios.TIOCGWINSZ, b'\0' * 8)


def badge_lines(key, label, count):
    cap = key + (f' ×{count}' if count > 1 else '')
    inner = BOX - 2
    return [
        ACCENT + '╭' + '─' * inner + '╮' + RESET,
        ACCENT + '│' + RESET + KEYCAP + cap.center(inner) + RESET + ACCENT + '│' + RESET,
        ACCENT + '╰' + '─' * inner + '╯' + RESET,
        DIM + label.center(BOX) + RESET,
    ]


def paint(lines, col):
    # Save the cursor, draw at a fixed spot, restore — the picker never notices.
    out = '\x1b7'
    for i, line in enumerate(lines):
        out += f'\x1b[{TOP + i};{col}H' + line
    os.write(1, (out + '\x1b8').encode())


def main(argv):
    cols = int.from_bytes(winsize(0)[2:4], 'little')
    col = max(1, cols - BOX - 2)
    master, slave = os.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, winsize(0))

    pid = os.fork()
    if pid == 0:
        os.setsid()
        fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
        for fd in (0, 1, 2):
            os.dup2(slave, fd)
        os.close(master)
        os.execvp(argv[0], argv)
    os.close(slave)

    saved = termios.tcgetattr(0)
    tty.setraw(0)
    shown = None   # (key, label, count) currently on screen
    until = 0.0
    try:
        while True:
            timeout = max(0.0, until - time.time()) if shown else None
            ready, _, _ = select.select([0, master], [], [], timeout)
            if not ready and shown:
                paint([' ' * BOX] * 4, col)  # fade out
                shown = None
                continue
            if master in ready:
                try:
                    data = os.read(master, 65536)
                except OSError:
                    break
                if not data:
                    break
                os.write(1, data)
                if shown:
                    paint(badge_lines(*shown), col)  # the picker repainted; put it back
            if 0 in ready:
                data = os.read(0, 1024)
                if not data:
                    break  # input closed: stop, don't spin
                hit = KEYS.get(data)
                if hit:
                    count = shown[2] + 1 if shown and shown[0] == hit[0] else 1
                    shown = (hit[0], hit[1], count)
                    until = time.time() + SHOW_FOR
                    paint(badge_lines(*shown), col)
                    if data in SAVE_KEYS:
                        time.sleep(HOLD_ON_EXIT)
                        shown = None
                os.write(master, data)
    finally:
        termios.tcsetattr(0, termios.TCSADRAIN, saved)
    _, status = os.waitpid(pid, 0)
    return os.waitstatus_to_exitcode(status)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

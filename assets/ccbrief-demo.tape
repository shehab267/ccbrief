# The README demo: install ccbrief, then choose what the status line shows.
#
# Re-record it whenever `init` or the picker changes, so the GIF never shows a UI
# that no longer exists. Needs vhs (github.com/charmbracelet/vhs), python3, an emoji
# font, and JetBrainsMono Nerd Font Mono (github.com/ryanoasis/nerd-fonts), so the
# nerd-font symbol set draws its icons instead of empty boxes.
#
# Run it from the repo root with a throwaway HOME: `init` really installs, and it
# would otherwise rewrite your own ~/.claude/settings.json.
#
#   HOME="$(mktemp -d)" vhs assets/ccbrief-demo.tape
#
# `init` prints the config file's full path. The published GIF was recorded with
# that throwaway HOME mounted at /home/you (bwrap), so the path reads cleanly.
#
# It records THIS checkout, not the npm release: `npx ccbrief` runs bin/ccbrief.js,
# so the GIF matches the code it ships with. Run `npm run build` first — `init`
# installs dist/statusline.js.
#
# The key badges on the right come from ccbrief-demo-keycast.py, which wraps
# `npx ccbrief config` for the recording only. Arrow keys and Space are invisible in
# a GIF otherwise.
Output assets/ccbrief-demo.gif

Set Shell "bash"
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set FontSize 17
Set Width 1240
Set Height 720
Set Padding 24
Set Theme "GitHub Dark"
Set WindowBar Colorful
Set BorderRadius 8
Set Margin 16
Set MarginFill "#0d1117"
Set TypingSpeed 55ms
Set CursorBlink false

Hide
# The stock Debian/Ubuntu bash prompt, `npx ccbrief` pointed at this checkout, and `config` run under the
# keycast wrapper.
Type `export PS1='\[\e[01;32m\]you@laptop\[\e[00m\]:\[\e[01;34m\]~/my-project\[\e[00m\]$ ' CCBRIEF="$PWD/bin/ccbrief.js" KEYCAST="$PWD/assets/ccbrief-demo-keycast.py"`
Enter
Type `npx() { if [ "$1 $2" = "ccbrief config" ]; then python3 "$KEYCAST" node "$CCBRIEF" config; elif [ "$1" = ccbrief ]; then shift; node "$CCBRIEF" "$@"; else command npx "$@"; fi; }`
Enter
Type "clear"
Enter
Sleep 1s
Show

# 1. Install.
Sleep 600ms
Type "npx ccbrief init"
Sleep 400ms
Enter
Sleep 4.5s

# 2. Open the picker.
Type "npx ccbrief config"
Sleep 400ms
Enter
Sleep 2.2s

# 3. Presets: detailed shows everything, then back to standard.
Type "p"
Sleep 3s
Type "p"
Sleep 500ms
Type "p"
Sleep 1.8s

# 4. Turn on one more segment (cost) and move it earlier.
Down@260ms 6
Sleep 1.2s
Space
Sleep 2.2s
Left@450ms 4
Sleep 2.4s

# 5. Symbols: emoji, nerd-font, ascii, then back to simple.
Type "y"
Sleep 2.2s
Type "y"
Sleep 2.2s
Type "y"
Sleep 2.2s
Type "y"
Sleep 1.8s

# 6. Hide the icons, then show them again.
Type "i"
Sleep 2.2s
Type "i"
Sleep 1.8s

# 7. Save.
Enter
Sleep 4s

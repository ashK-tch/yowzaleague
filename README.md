# Yowza League site

The homepage for yowzaleague.com: Yowza of the Week, weekly awards, the scoreboard,
standings with all-play records, coach efficiency, and the luck index. It rebuilds
itself from ESPN every morning.

## What it costs

Nothing beyond the domain renewal.

- ESPN's fantasy API is free. It's unofficial (ESPN doesn't document it), so it can
  change without warning. If it does, the fix goes in `espn.py`.
- GitHub Pages hosting and the daily GitHub Action are free as long as the repository
  is public. Your ESPN cookies stay in GitHub's encrypted secrets and never appear in
  the code or on the site.
- You don't need any GoDaddy hosting or website-builder plan. Only the domain.

## One-time setup (about 20 minutes)

### 1. Put the code on GitHub

1. Make a free account at github.com if you don't have one.
2. Create a new **public** repository called `yowzaleague`.
3. On the empty repo page, click **uploading an existing file**, drag in everything
   from this folder, and commit. The `.github` folder is hidden on Mac; press
   Cmd+Shift+. in Finder to show it, and make sure it uploads too.

### 2. Tell it which league to read

In the repo: **Settings > Secrets and variables > Actions**.

- **Variables** tab > New repository variable: `LEAGUE_ID` = the number after
  `leagueId=` in your ESPN league's URL.
- If the league is private, **Secrets** tab > add two secrets:
  - `ESPN_S2`: on espn.com (signed in), open Chrome DevTools > Application >
    Cookies > espn.com, and copy the value of `espn_s2`.
  - `ESPN_SWID`: the value of `SWID` from the same list, curly braces included.

  These cookies expire every so often. When the daily build starts failing with an
  "ESPN refused access" message, copy fresh ones in.

  The simpler alternative: the league manager can make the league viewable to the
  public in ESPN's league settings. Then no cookies are needed.

- Optional variable `SEASON` (for example `2026`). Without it the site uses the
  current NFL season.

### 3. Turn on GitHub Pages

**Settings > Pages**:

1. Under **Build and deployment > Source**, choose **GitHub Actions**.
2. Under **Custom domain**, enter `yowzaleague.com` and save.

Then go to the **Actions** tab, pick **Update site**, and click **Run workflow**.
The first run takes about a minute.

### 4. Point the domain at GitHub (in GoDaddy)

In GoDaddy, open the DNS records for yowzaleague.com (from your domain list, select the domain, then **DNS**).

1. Delete any existing **A** record named `@` (GoDaddy's "Parked" record) and any
   domain **forwarding** you set up.
2. Add four **A** records, name `@`, one for each of these values:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. Edit the **CNAME** record named `www` so it points to `YOUR-GITHUB-USERNAME.github.io`
   (your username only, no repository name).
4. Don't add a wildcard (`*`) record.

DNS changes usually take effect within an hour but can take up to a day. Once
GitHub's Pages settings show the domain as working, tick **Enforce HTTPS**.

Recommended: verify the domain in your GitHub account settings (**Settings > Pages >
Add a domain**), which adds one TXT record in GoDaddy. It stops anyone else from
claiming yowzaleague.com on GitHub.

## Day to day

- The site updates every morning on its own. To update it right now, use
  **Actions > Update site > Run workflow**.
- GitHub pauses scheduled runs in a public repo after 60 days with no commits. If the
  site stops updating in the offseason, click Run workflow once to wake it up.
- Shareable links to a specific week look like `yowzaleague.com/#week-6`.

## Members-only question

The site can ask visitors a question before showing anything. The league data is
encrypted at build time, and the right answer is the key, so the page source shows
nothing without it.

- Accepted answers live in the Actions secret `SITE_PASSWORDS`, separated by `|`
  (for example `First answer|Second answer`). Case, spaces and punctuation don't matter.
- The question defaults to "Who is the most dominant sith lord in the air?". To change it,
  add a repository variable `SITE_QUESTION`.
- Delete the secret to open the site to everyone again. After changing either one, run
  **Actions > Update site > Run workflow**.
- Visitors can tick "Remember me" so they only answer once per device.
- The iMessage link preview (title and `og.png`) stays public on purpose, so the Yowza of
  the Week still shows up in the group chat.

## Changing the theme song

Upload an audio file (`.mp3` works best) into the `music` folder on GitHub: open the
folder, click **Add file > Upload files**, drag the file in, and commit. The jukebox plays
it from then on, and the file name becomes the scrolling title. Delete the file to go
back to the built-in theme. Details are in `music/README.md`.

The built-in theme is composed in code in `template.html` (search for "jukebox: an
original theme"): `BPM` is the tempo, the `A`, `B` and `C` lists are the melody as MIDI
note numbers (60 is middle C), and `roots` is the bass line.

## Hall of Fame

Every season before ESPN lives in `history/seasons.csv`, one row per team per season:
`season,place,team,wins,losses,ties` (place is the final finish, 1 = champion). The
site adds each ESPN season on its own once that season's championship is decided.

Teams get renamed, so `history/managers.csv` says who owned which team, one line per team
name: `manager,team,seasons`. Leave `seasons` blank unless two people used the same team
name (then list the years, like `2016 2017`). Use the names people have on ESPN, so the
trading cards can find each manager's history. Any team name not listed is credited to
the team name itself.

To edit either file on GitHub, open it, click the pencil, change it, and commit. The site
rebuilds a minute later.

## Trading cards

One card per manager, numbered by the standings and rebuilt every morning: record, points
for and against, playoff odds, five ratings (OFF, COACH, LUCK, HUSTLE, CLUTCH, each scored
40–99 against the rest of the league), team MVP, best week, a nickname picked from whatever
stands out most about that team, and their league career from the Hall of Fame. Champions
get a holo card; managers with a top-3 finish get a rare one. Cards use the team's ESPN logo
when it has one, otherwise a pixel creature drawn from the team name. Clicking a team in the
standings jumps to its card, and links like `yowzaleague.com/#card-3` open one directly.

## Glorbo

Glorbo the lounge alien stands on the taskbar in the bottom-left corner. He dances while
the jukebox plays, blows a kiss now and then, and clicking him pops up a speech bubble with
gossip pulled from that week's numbers. Visitors can hide him from his bubble and bring
him back from **Start > Glorbo**. His sprite sheet is `art/glorbo.png` (12 frames of 84 x 104
pixels, side by side). Replace that file with a new sheet of the same layout to redraw him.

## Running it on your own computer

```
pip install -r requirements.txt
python build.py --sample                     # made-up data
LEAGUE_ID=123456 python build.py             # real league (add ESPN_S2 / ESPN_SWID if private)
python test_lineup.py                        # checks the best-lineup math
```

Then open `site/index.html`.

## How the numbers work

- **Yowza of the Week**: the team that left the most points on its bench, measured
  against the best legal lineup from its own roster that week.
- **Coach efficiency**: season points started divided by best possible points.
- **All-play**: each week, every team's score is compared with every other team's
  score. Ten teams means nine "games" per week.
- **Luck**: actual wins minus the wins all-play says the scores earned.
  Standings, all-play and luck use regular-season weeks only.
- **Playoff odds**: 20,000 simulated finishes to the regular season. Each team's weekly
  score is drawn around its average so far (pulled a little toward the league average,
  since eight games is a small sample). Ties in the standings are broken by points scored.
- **Schedule swap**: each team's own weekly scores replayed against another team's
  opponents. If that schedule includes a game against the team itself, it plays the
  schedule's owner instead.
- **Link preview**: every build draws `og.png`, the picture iMessage shows when someone
  pastes the site's link, with that week's Yowza of the Week.

## Yowza Bowl

A ten-pin bowling game in its own window at the bottom of the page (**Start > Yowza Bowl**), in the
spirit of the early-2000s browser bowling games where a few cartoon bowlers shared a lane and a chat box.

- Two to four bowlers a game: you, other people on the same phone or computer (pass and play), and
  computer players. Every league manager is a computer player whose skill comes from their trading
  card (COACH, OFF and LUCK set their aim; CLUTCH sets their tenth-frame nerves). Three house bowlers
  cover easy, medium and hard. With four bowlers you can play teams.
- Build a bowler (body, color, eyes, hat) and pick one of four balls that roll differently.
- Three presses to bowl: pick a spot, stop the power bar, stop the spin needle.
- The lane chat has Glorbo calling the frames and the computer players talking trash with real
  league numbers.
- **Challenge links:** a finished game fits in a link (`yowzaleague.com/#bowl-...`). Paste it in the
  group chat and whoever opens it bowls against that exact game, throw for throw. There is no game
  server, so this is how league members play each other.
- Best game, games bowled and strikes are remembered on each device. There is no shared leaderboard.
- The game is one file, `games/yowzabowl.js`, with its art drawn in code and its sounds synthesized.
  To retune it, the lane constants and the four balls are at the top of that file; run
  `node games/test_bowl.js` afterwards.

## Files

| File | What it does |
|---|---|
| `espn.py` | Talks to ESPN and turns its data into plain lists |
| `stats.py` | Best lineups, awards, all-play, luck, efficiency |
| `template.html` | The page design |
| `build.py` | Puts it together into `site/index.html` |
| `season.py` | Playoff odds, schedule swap grid, record book |
| `share.py` | The link preview picture and app icon |
| `history.py` | The Hall of Fame: champions, all-time table, league lore |
| `cards.py` | The manager trading cards |
| `history/` | League history before ESPN, and who owned which team |
| `test_history.py` | Checks the Hall of Fame math |
| `games/yowzabowl.js` | Yowza Bowl: lane physics, scoring, computer bowlers, challenge links and the game window |
| `games/test_bowl.js` | Checks the bowling engine |
| `art/` | Pictures published with the page (Glorbo's sprite sheet) |
| `music/` | Drop the theme song here |
| `sample.py` | Made-up league for previews |
| `test_season.py` | Checks the playoff odds and schedule swap math |
| `.github/workflows/update-site.yml` | The daily rebuild and publish |

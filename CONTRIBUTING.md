# Contributing

Thanks for helping make these pages better. Everyone is welcome: people who play,
teach, write or code. Please follow the [code of conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a mistake in the music.** Much of the site was drafted with AI tools, and
  not every chord, note and count has been checked by a person. Open an issue and
  choose *A mistake in the music*. Saying how you know (a book, a teacher, playing
  it) helps a lot.
- **Fix one.** A small fix to the text can be made right in GitHub's editor: open the
  page's file in `pages/`, edit it, and propose the change.
- **Report a bug** — something that breaks, plays the wrong thing or looks wrong.
  Say which browser and device.
- **Suggest or write a topic.** Open an issue first to talk it through: a new page is
  a big piece of work, and it's good to agree on what it covers before you start.
- **Make it easier to use**: on a phone, with a keyboard, with a screen reader.
- **Review pull requests**, and try them out.

Security problems are different: report them privately, as [SECURITY.md](SECURITY.md) says.

## Setting up

You need [Node.js](https://nodejs.org) 22.13 or later, and git.

```sh
npm ci           # install the build tools (the pages themselves have no dependencies)
npm run dev      # http://localhost:8000, rebuilt whenever you save; reload to see it
npm run check    # lint and tests: run before you open a pull request
```

You need no settings: visitor statistics are off unless a deployment sets them up.
To try a page on your phone, run `HOST=0.0.0.0 npm run dev` and open your computer's
address on port 8000.

## How the code is organised

The [README](README.md#where-things-are) shows where everything is, and each module
starts with a comment saying what it's for. A few rules keep it simple to work on:

- **Plain JavaScript modules, no framework, nothing third-party in the pages.** Don't
  add runtime dependencies; a new build tool needs a good reason.
- **Layers.** `js/lib` → `js/music` → `js/audio` and `js/draw` → `js/ui` →
  `js/pages/<page>`. A module imports only from its own folder or the layers before it,
  so everything can be used and tested on its own.
- **Markup made by scripts** is built with the helpers in `js/lib/svg.js`, which escape
  text; anything else that isn't fixed text goes through `escape()`.
- **No inline styles or event handlers** (`style="…"`, `onclick="…"`) in templates or in
  markup made by scripts: set styles through the DOM instead (`el.style.left = …`). The site
  runs under a strict Content-Security-Policy, and a test checks this.
- **Every page keeps working** on a phone, with a keyboard, and opened straight from
  disk (`dist/` without a server).
- **Comments are short JSDoc** on what's exported: what it does, and an example where
  that's clearer than words. Explain *why* in the code, not *what*.

## Tests

Every change to what the site does comes with a test of what a reader or player would
notice: the music, what's drawn, what plays and when. Test each thing once, where it's
simplest (a module's own test, or `test/pages/` for what only the page does), and skip
errors that only our own code could cause.

```sh
npm test                 # everything
npm run coverage         # and how much of the code it reaches
node --experimental-vm-modules --test test/pages/beats-101.test.js   # one file
```

Tests mirror `js/`: `test/pages/` loads whole pages into jsdom and plays them with a fake
audio clock. They check the music too: every guitar fingering plays its chord, every
rhythm adds up to its bars. If you add music, add a test that checks it.

## Writing for the pages

- One idea per page, in short sentences. Say why, not only what.
- British English: *practise* (the verb), *colour*, *synthesised*.
- Every example should play. Rhythms are written as short text (`q q e e h`; see
  `js/music/rhythm.js`), chords as frets or notes (`js/music/guitar.js`).
- **Check every chord, note and count you add or change** — by ear, on an instrument, or
  against a source — and say how in your pull request.
- If you change what the site collects or how it's made, update `pages/disclaimer.hbs`
  so it stays true.

## Adding a page

1. Create `pages/<name>.hbs`:
   ```hbs
   {{#> layout title="Intervals" styles=(list "diagrams" "player") script="intervals" instrument=true}}
   <h1>Intervals</h1>
   {{> chord-shape guitar="x 3 2 0 1 0" root="C" quality="maj" name="C"}}
   {{/layout}}
   ```
   `templates/layout.hbs` lists the options.
2. If it needs a script, create `js/pages/<name>/index.js`; it sets the page up once it
   has loaded:
   ```js
   import { renderDiagramTags } from '../../ui/diagram-tags.js';
   import { wireChordButtons } from '../../ui/play-buttons.js';

   document.addEventListener('DOMContentLoaded', () => {
     renderDiagramTags(document); // the chord-shape diagrams
     wireChordButtons(document); // and their play buttons
   });
   ```
3. Link it from `pages/index.hbs`.
4. Add `test/pages/<name>.test.js` (`await loadPage('<name>.html')` from `test/helpers.js`)
   for what the page does.

Wrap guitar-only or piano-only text in `class="only-g"` / `class="only-p"`. Fingerings
live in `js/music/guitar.js` (`COMMON` for the tables, `FORMS` for the builder), and
`{{> rhythm-exercise …}}` turns a rhythm into playable notation.

### Music symbols

The notation is drawn from glyph outlines in the [Bravura](https://github.com/steinbergmedia/bravura)
font, in `js/draw/glyphs.js`. That file is generated: don't edit it by hand, and keep its
licence notice at the top. If you need a symbol that isn't there yet, say so in an issue.

## Pull requests

- Branch from `main`, and keep a pull request to one change: they're reviewed faster.
- Run `npm run check`. CI runs it too, on Node 22 and 24, and must pass.
- Describe what changed and why. For anything visible, add screenshots at phone and
  desktop width.
- Changes to `.github/`, `.gitea/`, `scripts/` or `package.json` get a closer review:
  they run in CI and on the deployment's server.
- A maintainer reviews every pull request. It may take a few days.

### AI tools

Using them is fine — much of this site was made with them. You're responsible for
everything you submit: read it, run it, and check the music. If a large part of a
pull request was generated, say so.

## License

The project is under the [MIT License](LICENSE). By contributing, you agree that your
contribution is under it too.

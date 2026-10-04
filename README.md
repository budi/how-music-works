# How music works

Short, playable pages about music for guitar and piano: note distances, reading notes,
rhythm and the number system. One idea per page, and every example plays: the notation,
the chord diagrams and the sounds are all made in the browser.

It's a static site with no framework and no third-party code in its pages. Pages are
Handlebars templates; the build turns them into plain, minified HTML, with one bundled
script per page.

Contributions are welcome, corrections to the music most of all: see
[CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

Needs Node 22.13+.

```sh
npm ci           # once
npm run dev      # serve at http://localhost:8000, rebuilding on every change
npm run check    # lint + tests — run before you open a pull request
npm run build    # the deployable site, in dist/
```

No settings are needed: visitor statistics are off unless a deployment sets them up
([.env.example](.env.example)).

## Where things are

| Folder       | What                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `pages/`     | one `.hbs` per page (`index.hbs` lists the topics)                                             |
| `templates/` | `layout.hbs` (shared `<head>`, top bar, footer) and `partials/`                                |
| `css/`       | styles                                                                                         |
| `js/`        | browser scripts, as ES modules (below)                                                         |
| `scripts/`   | `render.js` (templates), `build.js` (`dist/`), `dev.js`, `config.js` (a deployment's settings) |
| `test/`      | tests, in the same folders as `js/`                                                            |

The templates and modules start with a comment explaining how to use them —
`templates/layout.hbs` lists the page options, `js/music/guitar.js` the chord notation,
`js/music/rhythm.js` the rhythm notation.

### Scripts

`js/` is in layers. A module imports only from its own folder or the ones above it in
this table, so anything can be used — and tested — without the layers below it.

| Folder             | What                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `js/lib/`          | small helpers: SVG markup, the DOM, storage, randomness, text                                   |
| `js/music/`        | music theory: notes, keys, chords, voicings, rhythms; no page, no sound                         |
| `js/audio/`        | the sounds, the player, and timelines (what to play, and when)                                  |
| `js/draw/`         | drawings as SVG strings: notation, staves, chord diagrams, keyboards                            |
| `js/ui/`           | parts pages share: play controls, play buttons, the guitar/piano switch                         |
| `js/pages/<page>/` | one folder per page: `index.js` starts it, each other file is a section                         |
| `js/site/`         | page-wide: the guitar/piano switch (in `<head>`), visitor statistics (if a deployment has them) |

The build bundles each page's `index.js`, with everything it imports, into one classic
script, so a page saved to disk still works. Only those entry files (and `site/`) do
anything when loaded; every other module just exports functions.

Comments are JSDoc (`/** … */` with `@param`, `@returns`, `@typedef`, `@module`), so a
tool like [JSDoc](https://jsdoc.app) or [TypeDoc](https://typedoc.org) can turn them into
documentation. Plain functions get a line with an example; option objects and shared
data shapes (`Rhythm`, `Timeline`, `GuitarVoicing`, …) are written out in full.

## Contributing

- [CONTRIBUTING.md](CONTRIBUTING.md): how to help, how the code is organised, adding a page
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): how we treat each other
- [SECURITY.md](SECURITY.md): reporting a security problem, privately
- [docs/deploying.md](docs/deploying.md): running your own copy

## License

[MIT](LICENSE), for the code and the text. The music symbols are glyph outlines from the
[Bravura](https://github.com/steinbergmedia/bravura) font © Steinberg Media Technologies GmbH,
used under the [SIL Open Font License 1.1](licenses/bravura-OFL.txt) (in `js/draw/glyphs.js`
and `favicon.svg`).

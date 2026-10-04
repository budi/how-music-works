/**
 * Entry for pages with guitar and piano content: loaded in <head> without
 * `defer`, so the remembered choice applies before the page paints.
 * Pages get it, and the switch's buttons, from the layout with `instrument=true`.
 *
 * @module site/instrument
 */
import { setupInstrumentSwitch } from '../ui/instrument.js';

setupInstrumentSwitch();

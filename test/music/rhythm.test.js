import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { beamGroups, counts, parseRhythm, parseTime } from '../../js/music/rhythm.js';

const shape = (rhythm) => rhythm.events.map((e) => `${e.value}${e.dotted ? '.' : ''}${e.rest ? 'r' : ''}@${e.start}`).join(' ');

describe('time signatures', () => {
  it('reads simple and compound time: in 6/8 the beat is a dotted quarter', () => {
    const t = parseTime('4/4');
    assert.deepEqual([t.beats, t.unit, t.barTicks, t.beatTicks, t.pulses, t.compound], [4, 4, 96, 24, 4, false]);
    const six = parseTime('6/8');
    assert.deepEqual([six.barTicks, six.beatTicks, six.pulses, six.compound], [72, 36, 2, true]);
  });
});

describe('parsing rhythms', () => {
  it('reads note values, dots, rests and bars', () => {
    assert.equal(shape(parseRhythm('q. e hr', '4/4')), 'q.@0 e@36 hr@48');
    assert.equal(shape(parseRhythm('s s e q h', '4/4')), 's@0 s@6 e@12 q@24 h@48');
    const p = parseRhythm('h q | q q q', '3/4');
    assert.deepEqual([p.bars, p.totalTicks, p.events.map((e) => e.bar).join('')], [2, 144, '00111']);
  });

  it('reads triplets as three in the time of two', () => {
    const p = parseRhythm('[e e e] q h', '4/4');
    assert.deepEqual(p.events.map((e) => [e.start, e.length, e.tuplet]), [[0, 8, 0], [8, 8, 0], [16, 8, 0], [24, 24, null], [48, 48, null]]);
    assert.equal(parseRhythm('[q q q] h', '4/4').events[2].length, 16);
  });

  it('reads ties: the second note is a continuation', () => {
    const p = parseRhythm('h ~ q q', '4/4');
    assert.deepEqual(p.events.map((e) => [e.tieStart, e.tieEnd]), [[true, false], [false, true], [false, false]]);
  });

  it('reads which sounds play, with a default', () => {
    const p = parseRhythm('e:hh+sn e:bd qr h', '4/4', ['clap']);
    assert.deepEqual(p.events.map((e) => e.sounds), [['hh', 'sn'], ['bd'], [], ['clap']]);
  });

  it('says which bar doesn’t add up', () => {
    assert.throws(() => parseRhythm('q q q', '4/4'), /Bar 1 .* lasts 3 quarters, but 4\/4 needs 4 quarters/);
  });
});

describe('counting', () => {
  const say = (text, time) => counts(parseRhythm(text, time)).join(' ');

  it('counts beats, "&" and "e … a" in simple time, from 1 in every bar', () => {
    assert.equal(say('q q e e q', '4/4'), '1 2 3 & 4');
    assert.equal(say('s s s s q h', '4/4'), '1 e & a 2 3');
    assert.equal(say('h q | q q q', '3/4'), '1 3 1 2 3');
  });

  it('counts triplets as "trip let", by where each note falls in its group', () => {
    assert.equal(say('[e e e] [e e e] h', '4/4'), '1 trip let 2 trip let 3');
    assert.equal(say('h [q q q]', '4/4'), '1 3 trip let');
    assert.equal(say('[q e] [e q] [er e e] [e e er]', '4/4'), '1 let 2 trip 3 trip let 4 trip let');
  });

  it('counts compound time as "1 & a 2 & a"', () => {
    assert.equal(say('e e e e e e', '6/8'), '1 & a 2 & a');
    assert.equal(say('q e q e', '6/8'), '1 a 2 a');
  });
});

describe('beams', () => {
  const beams = (text, time) => beamGroups(parseRhythm(text, time).events, parseTime(time));

  it('joins eighths and sixteenths within a beat (in threes in compound time), and a triplet as one group', () => {
    assert.deepEqual(beams('e e e e q q', '4/4'), [[0, 1], [2, 3]]);
    assert.deepEqual(beams('s s s s e. s h', '4/4'), [[0, 1, 2, 3], [4, 5]]);
    assert.deepEqual(beams('e e e e e e', '6/8'), [[0, 1, 2], [3, 4, 5]]);
    assert.deepEqual(beams('[e e e] q h', '4/4'), [[0, 1, 2]]);
  });

  it('breaks beams at rests and longer notes; a lone eighth gets a flag', () => {
    assert.deepEqual(beams('e er q h', '4/4'), [[0]]);
    assert.deepEqual(beams('q. e h', '4/4'), [[1]]);
  });
});

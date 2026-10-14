/**
 * A quiz's score: questions answered right the first time, and how many in a
 * row. A miss breaks the run, and the question no longer counts as right.
 *
 * @example
 * const score = quizScore();
 * score.ask(); score.miss(); score.hit();
 * score.text  // '0 of 1 right first time.'
 *
 * @module ui/score
 */
export function quizScore() {
  let asked = 0;
  let right = 0;
  let streak = 0;
  let missed = false;
  return {
    /** A new question. */
    ask() {
      asked++;
      missed = false;
    },
    /** A wrong answer to this question. */
    miss() {
      missed = true;
      streak = 0;
    },
    /** The right answer, at last or first time. */
    hit() {
      if (!missed) { right++; streak++; }
    },
    get text() {
      return `${right} of ${asked} right first time` + (streak > 1 ? ` · ${streak} in a row` : '') + '.';
    },
  };
}

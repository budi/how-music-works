/**
 * A quiz's score: questions answered right the first time, and how many in a
 * row. A question answered after a miss still counts as asked, and breaks the run.
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
    },
    /** The right answer, at last or first time. */
    hit() {
      if (missed) streak = 0;
      else { right++; streak++; }
    },
    get text() {
      return `${right} of ${asked} right first time` + (streak > 1 ? ` · ${streak} in a row` : '') + '.';
    },
  };
}

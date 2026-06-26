'use strict';

const { BorderStyle } = require('docx');

const THEME = {
  font: 'Arial',
  color: {
    dark:    '1B4332',
    mid:     '2D6A4F',
    light:   '40916C',
    pale:    '74C69D',
    white:   'FFFFFF',
    gray:    '555555',
    rowEven: 'F0FAF4',
    border:  'CCCCCC',
    warn:    'FFF3CD',
    warnText:'856404',
    crit:    'F8D7DA',
    critText:'721C24',
  },
  size: {
    cover:    52,
    title:    40,
    subtitle: 30,
    tagline:  28,
    h1:       32,
    h2:       26,
    h3:       24,
    body:     22,
    small:    20,
  },
};

const CELL_BORDER  = { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border };
const CELL_BORDERS = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };
const HEAD_BORDER  = { style: BorderStyle.SINGLE, size: 1, color: THEME.color.mid };
const HEAD_BORDERS = { top: HEAD_BORDER, bottom: HEAD_BORDER, left: HEAD_BORDER, right: HEAD_BORDER };

module.exports = { THEME, CELL_BORDER, CELL_BORDERS, HEAD_BORDER, HEAD_BORDERS };

import * as dotenv from 'dotenv';
import { Util } from './util';

dotenv.config();

describe('Util', () => {
  beforeEach(() => {});

  test('#deepmerge 1', async () => {
    const target = Util.deepmerge([arr1, arr2]);
    expect(target).toEqual(expectObj1);
  });
});

//=====================================data

const arr1 = {
  a: {
    a1: 11,
    a2: 12,
  },
};

const arr2 = {
  a: {
    a1: 999,
    a3: 13,
  },
  b: {
    b1: 21,
  },
};

const expectObj1 = {
  a: {
    a1: 999,
    a2: 12,
    a3: 13,
  },
  b: {
    b1: 21,
  },
};

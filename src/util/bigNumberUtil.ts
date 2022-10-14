import BigNumber from 'bignumber.js';

// MEMO v2以降では使わない。CalculateUtilを使う。
export class BigNumberUtil {
  BN(numStr: string | number) {
    return new BigNumber(Number(numStr));
  }
}

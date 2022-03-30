import BigNumber from 'bignumber.js';

export class BigNumberUtil {
  BN(numStr: string | number) {
    return new BigNumber(Number(numStr));
  }
}

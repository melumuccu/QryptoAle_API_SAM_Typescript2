import BigNumber from "bignumber.js";

export class BigNumberUtil {
  BN(numStr: string) {
    return new BigNumber(Number(numStr));
  }
}

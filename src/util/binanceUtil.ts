import { Balance } from "../interface/binance";
import { BigNumberUtil } from "./bigNumberUtil";

const Binance = require("node-binance-api");
const BNUtil = new BigNumberUtil();

export class BinanceUtil {
  /**
   * 指定通貨の現在保有数量を取得
   * @param includeOnOrder 注文中の数量を含むか
   * @param coin 指定通貨
   * @param binance
   * @returns 現在保有数量
   */
  getCoinBalance(binance: typeof Binance): Promise<string> {
    return new Promise((resolve, reject) => {
      binance.balance(function (error: string, balances: Balance) {
        const btcAvailableBN = BNUtil.BN(balances["BTC"]["available"]);
        const btcOnOrderBN = BNUtil.BN(balances["BTC"]["onOrder"]);
        const sum = btcAvailableBN.plus(btcOnOrderBN);
        return resolve(JSON.stringify(sum));
      });
    });
  }
}

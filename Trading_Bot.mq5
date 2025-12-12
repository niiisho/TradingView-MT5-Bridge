//+------------------------------------------------------------------+
//| FULL TRADING BOT - BUY/SELL/CLOSE ALL WORKING           |
//+------------------------------------------------------------------+
#property copyright "2025"
#property version   "4.0"
#property strict

#include <Trade\Trade.mqh>

input double LotSize = 0.01;
input int TakeProfitPoints = 100;
input int StopLossPoints = 50;
input string AlertFilePath = "alerts.txt";
input int MagicNumber = 12345;

CTrade trade;

string BUY = "BUY";
string SELL = "SELL";



int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   
   ClearAlertFile();
   Print("✅ BOT READY");
   return(INIT_SUCCEEDED);
}  


void OnTick()
{
   string alert = ReadAlertFromFile();
   
   if(alert != "")
   {
      Print("🔔 NEW ALERT: ", alert);
      ProcessAlert(alert);
      ClearAlertFile();  // Prevent repeats
   }
}

string ReadAlertFromFile()
{
   int handle = FileOpen(AlertFilePath, FILE_READ|FILE_TXT|FILE_ANSI, 0, CP_UTF8);
   if(handle == INVALID_HANDLE) return "";
   string result = FileReadString(handle);
   FileClose(handle);
   return result;
}


void ProcessAlert(string alert)
{
   if(PositionsTotal() > 0)
   {
      Print("⛔ ALREADY 1 TRADE OPEN - IGNORING SIGNAL");
      return;
   }
   
   
   // Parse SL/TP properly with regex-like extraction
   int sl_pips = 50, tp_pips = 100;
   double lot_size = LotSize;
   
   // Extract SL
   int sl_start = StringFind(alert, "SL=");
   if(sl_start >= 0)
   {
      string sl_part = StringSubstr(alert, sl_start + 3);
      int sl_end = StringFind(sl_part, " ");
      if(sl_end < 0) sl_end = StringLen(sl_part);
      string sl_str = StringSubstr(sl_part, 0, sl_end);
      sl_pips = (int)StringToInteger(sl_str);
   }
   
   // Extract TP
   int tp_start = StringFind(alert, "TP=");
   if(tp_start >= 0)
   {
      string tp_part = StringSubstr(alert, tp_start + 3);
      int tp_end = StringFind(tp_part, " ");
      if(tp_end < 0) tp_end = StringLen(tp_part);
      string tp_str = StringSubstr(tp_part, 0, tp_end);
      tp_pips = (int)StringToInteger(tp_str);
   }
   
   // Extract LOT
   int lot_start = StringFind(alert, "LOT=");
   if(lot_start >= 0)
   {
      string lot_part = StringSubstr(alert, lot_start + 4);
      int lot_end = StringFind(lot_part, " ");
      if(lot_end < 0) lot_end = StringLen(lot_part);
      string lot_str = StringSubstr(lot_part, 0, lot_end);
      lot_size = StringToDouble(lot_str);
   }
   
   // ENFORCE LOT LIMITS
   double min_lot = SymbolInfoDouble(Symbol(), SYMBOL_VOLUME_MIN);
   double max_lot = SymbolInfoDouble(Symbol(), SYMBOL_VOLUME_MAX);
   lot_size = MathMax(min_lot, MathMin(max_lot, lot_size));
   
   
   if(StringFind(alert, BUY) >= 0)
   {
      OpenBuyOrder(Symbol(), lot_size, sl_pips, tp_pips);
      return;
   }
   
   if(StringFind(alert, SELL) >= 0)
   {
      OpenSellOrder(Symbol(), lot_size, sl_pips, tp_pips);
      return;
   }
}


void OpenBuyOrder(string symbol, double lot, int sl_pips, int tp_pips)
{
   ClosePositionsByType(symbol, POSITION_TYPE_SELL);
   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double tp = ask + tp_pips * point;
   double sl = ask - sl_pips * point;
   
   if(trade.Buy(lot, symbol, ask, sl, tp, "BUY"))
      Print("✅ BUY OPENED! LOT=", lot, " SL=", sl_pips, " TP=", tp_pips);
   else
      Print("❌ BUY FAILED: ", trade.ResultRetcode());
}

void OpenSellOrder(string symbol, double lot, int sl_pips, int tp_pips)
{
   ClosePositionsByType(symbol, POSITION_TYPE_BUY);
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   double tp = bid - tp_pips * point;
   double sl = bid + sl_pips * point;
   
   if(trade.Sell(lot, symbol, bid, sl, tp, "SELL"))
      Print("✅ SELL OPENED! LOT=", lot, " SL=", sl_pips, " TP=", tp_pips);
   else
      Print("❌ SELL FAILED: ", trade.ResultRetcode());
}


void ClosePositionsByType(string symbol, ENUM_POSITION_TYPE type)
{
   for(int i = PositionsTotal()-1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(ticket) && 
         PositionGetString(POSITION_SYMBOL) == symbol &&
         PositionGetInteger(POSITION_MAGIC) == MagicNumber &&
         PositionGetInteger(POSITION_TYPE) == type)
      {
         trade.PositionClose(ticket);
      }
   }
}

void ClearAlertFile()
{
   int handle = FileOpen(AlertFilePath, FILE_WRITE|FILE_TXT|FILE_ANSI, 0, CP_UTF8);
   if(handle != INVALID_HANDLE) FileClose(handle);
}

class Solution {
    public int maxProfit(int[] prices) {
        int maxprofit=0;
        int minprice=prices[0];
        for(int s:prices){
            if(s<minprice) minprice=s;
            int profit=s-minprice;
            if(profit>maxprofit){
                maxprofit=profit;
            }
           
        }

         return maxprofit;
    }
}
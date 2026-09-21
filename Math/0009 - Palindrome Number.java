class Solution {
    public boolean isPalindrome(int x) {
         if(x<0||x%10==0&&x!=0){
            return false;
         }
         int rev=0;
         int real=x;
         while(x>0){
            int digits=x%10;
             rev=(rev*10)+digits;
            x/=10;
         }
         return real==rev;
    }
}

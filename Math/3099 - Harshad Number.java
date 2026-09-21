class Solution {
    public int sumOfTheDigitsOfHarshadNumber(int x) {
         int b=x;
           int ans=0;
           while(x>0){
            int digit=x%10;
            x/=10;
            ans+=digit;
    }  if(b%ans==0){
        return ans;
    } 
    return -1;
}
}

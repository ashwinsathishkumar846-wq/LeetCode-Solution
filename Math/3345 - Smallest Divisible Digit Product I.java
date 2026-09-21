class Solution {
    public int smallestNumber(int n, int t) {
        int a = n;
        boolean found = false;
        while(!found){
            if(pdigit(a) % t == 0) found = true;
            else a++;
        }
        return a;
    }
    private int pdigit(int n){
        int ans = 1;
        while(n>0){
            int digit = n%10;
            n/=10;
            ans *= digit;
        }
        return ans;
    }
}

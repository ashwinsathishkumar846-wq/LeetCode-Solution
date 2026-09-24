class Solution {
    public int smallestIndex(int[] nums) {
        for(int i=0; i<nums.length;i++){
            int num = nums[i];
            int digitsum = 0;
            while( num > 0){
                digitsum += num % 10;
                num = num/10;
            }
            if(digitsum == i)
            return i;
        }
        return -1;
    }
}
class Solution {
    public int findMaxConsecutiveOnes(int[] nums) {
        int currentones=0;
        int maximumones=0;
        if(nums==null||nums.length==0){
            return 0;
        }
        for(int i=0;i<nums.length;i++){
            if(nums[i]==1){
                currentones++;
            maximumones = Math.max(maximumones, currentones); }
            else{
                currentones=0;
            }
            
        }
        return maximumones;
    }
}

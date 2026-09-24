class Solution {
    public int numIdenticalPairs(int[] nums) {
        int totalpair = 0;
        int[] count = new int[1001]; 
        for (int n : nums) {
            totalpair += count[n];
            count[n]++;
        }
        return totalpair;
    }
}

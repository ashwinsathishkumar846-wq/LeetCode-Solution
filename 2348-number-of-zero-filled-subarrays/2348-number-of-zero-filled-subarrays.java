class Solution {
    public long zeroFilledSubarray(int[] nums) {
        long count = 0;
        long total = 0;
        for (int num : nums) {
            if (num == 0) {
                count++;
                total += count;
            } else {
                count = 0;
            }
        }
        return total;
    }
}
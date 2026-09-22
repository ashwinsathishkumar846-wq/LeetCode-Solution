class Solution {
    public int firstMissingPositive(int[] nums) {
        // Store all numbers in a hash set for O(1) lookup
        Set<Integer> seen = new HashSet<>();
        for (int num : nums) {
            seen.add(num);
        }

        // Check 1, 2, 3, ... until we find one that's missing
        for (int i = 1; i <= nums.length + 1; i++) {
            if (!seen.contains(i)) {
                return i;
            }
        }

        return nums.length + 1;
    }
}
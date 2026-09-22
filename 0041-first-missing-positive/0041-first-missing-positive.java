//class Solution {
   // public int firstMissingPositive(int[] nums) {
    //    Set<Integer> seen = new HashSet<>();
   //     for (int num : nums) {
     //       seen.add(num);
    //    }
     //   for (int i = 1; i <= nums.length + 1; i++) {
    //        if (!seen.contains(i)) {
    //            return i;
    //        }
  //      }
  //      return nums.length + 1;
  //  }
//}
//change
class Solution {
    public int firstMissingPositive(int[] nums) {
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            while (nums[i] >= 1 &&
                   nums[i] <= n &&
                   nums[i] != nums[nums[i] - 1]) {
                int correctIndex = nums[i] - 1;
                int temp = nums[i];
                nums[i] = nums[correctIndex];
                nums[correctIndex] = temp;
            }
        }
        for (int i = 0; i < n; i++) {
            if (nums[i] != i + 1) {
                return i + 1;
            }
        }
        return n + 1;
    }
}
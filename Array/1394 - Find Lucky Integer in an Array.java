class Solution {
    public int findLucky(int[] arr) {
        int[] freq = new int[501];
        for (int x : arr) {
            freq[x]++;
        }
        int ans = -1;
        for (int x = 1; x <= 500; x++) {
            if (freq[x] == x) {
                ans = x;
            }
        }
        return ans;
    }
}

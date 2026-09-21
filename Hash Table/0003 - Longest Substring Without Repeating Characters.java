import java.util.HashSet;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        HashSet<Character> set = new HashSet<>();
        int max = 0;
        int left = 0;
        
        for (int right = 0; right < s.length(); right++) {
            // If we see a duplicate, shrink the window from the left
            while (set.contains(s.charAt(right))) {
                set.remove(s.charAt(left));
                left++;
            }
            
            // Add the current character and calculate the max window size
            set.add(s.charAt(right));
            max = Math.max(max, right - left + 1);
        }
        
        return max;
    }
}

class Solution {
    public int lengthOfLastWord(String s) {
        String[] a=s.trim().split("\\s+");
        int n=a[a.length - 1].length(); 
         return n;
    }
    
}

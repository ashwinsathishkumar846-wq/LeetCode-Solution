class Solution {
    public int hammingWeight(int n) {
        int count =0;
       String str = Integer.toBinaryString(n);
       for (char c : str.toCharArray()) {
           if (c == '1') {
        count++;
    }
}
       return count;
    }
}
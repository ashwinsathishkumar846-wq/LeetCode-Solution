class Solution {
    public String reverseWords(String s) {
        String[] ashwin = s.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();

        for (int i = ashwin.length - 1; i >= 0; i--) {
            sb.append(ashwin[i]);

            if (i != 0) {
                sb.append(" ");
            }
        }

        return sb.toString();
    }
}
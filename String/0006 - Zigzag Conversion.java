class Solution {
    public String convert(String s, int numRows) {
        if (numRows == 1)
            return s;
        String[] row = new String[numRows];
        for (int i = 0; i < numRows; i++) {
            row[i] = "";
        }
        int currentRow = 0;
        boolean down = true;
        for (int i = 0; i < s.length(); i++) {
            row[currentRow] += s.charAt(i);
            if (currentRow == 0)
                down = true;
            if (currentRow == numRows - 1)
                down = false;
            if (down)
                currentRow++;
            else
                currentRow--;
        }
        String ans = "";
        for (int i = 0; i < numRows; i++) {
            ans += row[i];
        }
        return ans;
    }
}

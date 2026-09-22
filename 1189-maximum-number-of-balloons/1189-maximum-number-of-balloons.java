class Solution {
    public int maxNumberOfBalloons(String text) {
        int b = 0;
      int a = 0;
      int l = 0;
       int o = 0;
       int n = 0;
for (char s : text.toCharArray()) {
    if (s == 'b') b++;
    if (s == 'a') a++;
    if (s == 'l') l++;
    if (s == 'o') o++;
    if (s == 'n') n++;
     
}  
   l = l / 2;
        o = o / 2;

        return Math.min(
            Math.min(b, a),
            Math.min(l, Math.min(o, n))
        );

        
    }
}
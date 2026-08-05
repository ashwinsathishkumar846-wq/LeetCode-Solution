class Solution {
    public int numOfStrings(String[] patterns, String word) {
        int ashwin=0;
        for(String s:patterns){
             if(word.indexOf(s)!=-1) ashwin++;

        }
       return ashwin;
    }
}
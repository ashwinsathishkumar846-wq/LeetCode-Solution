class Solution {
    public boolean containsDuplicate(int[] nums) {
       HashSet<Integer> set = new HashSet<>();
       for (int s : nums){
        if(set.contains(s)){
            return true;
        }
          set.add(s);
       }
       return false;
    } 
    
}

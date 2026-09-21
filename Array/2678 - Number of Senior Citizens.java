class Solution {
    public int countSeniors(String[] details) {
        int count = 0;
        for(int i=0;i<details.length;i++){
           StringBuilder ages = new StringBuilder();
ages.append(details[i].charAt(11));
ages.append(details[i].charAt(12));
String ageStr = ages.toString();  
  int currentAge = Integer.parseInt(ageStr);
   if(currentAge>60){
    count++;
   }
    }
return count;
        
    }
}

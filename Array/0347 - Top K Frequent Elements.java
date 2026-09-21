class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        HashMap<Integer, Integer> map = new HashMap<>();
        for (int num : nums) {
        map.put(num, map.getOrDefault(num, 0) + 1);
        }
        PriorityQueue<Integer> pq = new PriorityQueue<>(
         (a, b) -> map.get(b) - map.get(a)
  );
        for (int key : map.keySet()) {
          pq.add(key);
        }
        int[] ans = new int[k];
        for (int i = 0; i < k; i++) {
         ans[i] = pq.poll();
        }
        return ans;
 }
}
// ________________________________________________________________________________________
// class Solution {

//     public int[] topKFrequent(int[] nums, int k) {

//         HashMap<Integer,Integer> map = new HashMap<>();

//         for(int num : nums){
//             map.put(num, map.getOrDefault(num,0)+1);
//         }

//         List<Integer>[] bucket = new ArrayList[nums.length + 1];

//         for(int key : map.keySet()){

//             int freq = map.get(key);

//             if(bucket[freq] == null){
//                 bucket[freq] = new ArrayList<>();
//             }

//             bucket[freq].add(key);
//         }

//         int[] ans = new int[k];
//         int index = 0;

//         for(int i = bucket.length - 1; i >= 0; i--){

//             if(bucket[i] != null){

//                 for(int num : bucket[i]){

//                     ans[index++] = num;

//                     if(index == k){
//                         return ans;
//                     }
//                 }
//             }
//         }

//         return ans;
//     }
// }

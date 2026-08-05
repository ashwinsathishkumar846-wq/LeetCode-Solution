class Solution {
    public int[] replaceElements(int[] arr) {
        int ans[]=new int[arr.length];
        if(arr.length==1) {ans[0]=-1; return ans;}
        for(int i=0;i<arr.length-1;i++){
            int max=arr[i+1];
            for(int j=i+1;j<arr.length;j++){
                max=Math.max(max,arr[j]);
            }
            ans[i]=max;
        }
        ans[ans.length-1]=-1;
        return ans;
    }
}
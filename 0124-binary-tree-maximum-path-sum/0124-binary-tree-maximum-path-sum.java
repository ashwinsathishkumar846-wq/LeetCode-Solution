/**
 * Definition for a binary tree node.
 * public class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */
class Solution {
    int answer = Integer.MIN_VALUE;
    public int maxPathSum(TreeNode root) {
        findMax(root);
        return answer;
    }
    private int findMax(TreeNode node) {
        if (node == null) {
            return 0;
        }
        int leftPath = Math.max(0, findMax(node.left));
        int rightPath = Math.max(0, findMax(node.right));
        int pathSum = node.val + leftPath + rightPath;
        answer = Math.max(answer, pathSum);
        return node.val + Math.max(leftPath, rightPath);
    }
}
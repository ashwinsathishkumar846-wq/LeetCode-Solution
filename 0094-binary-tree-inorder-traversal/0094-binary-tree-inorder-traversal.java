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
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> ashwin = new ArrayList<>();
        inorder(root, ashwin);
        return ashwin;
    }
    public void inorder(TreeNode root, List<Integer> ashwin) {
        if (root == null) {
            return;
        }
        inorder(root.left, ashwin);
        ashwin.add(root.val);
        inorder(root.right, ashwin);
    }
}
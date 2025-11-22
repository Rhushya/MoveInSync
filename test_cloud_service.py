"""
Unit tests for the Cloud Agent service.
"""

import unittest
from cloud_service import CloudAgent


class TestCloudAgent(unittest.TestCase):
    """Test cases for CloudAgent class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.agent = CloudAgent("test-agent", "us-west-2")
    
    def test_initialization(self):
        """Test agent initialization."""
        self.assertEqual(self.agent.agent_id, "test-agent")
        self.assertEqual(self.agent.region, "us-west-2")
        self.assertEqual(self.agent.status, "initialized")
    
    def test_delegate_task(self):
        """Test task delegation."""
        task_data = {"start": "A", "end": "B"}
        result = self.agent.delegate_task("route_optimization", task_data)
        
        self.assertEqual(result["agent_id"], "test-agent")
        self.assertEqual(result["task_type"], "route_optimization")
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["data"], task_data)
    
    def test_get_status(self):
        """Test status retrieval."""
        status = self.agent.get_status()
        
        self.assertIn("agent_id", status)
        self.assertIn("region", status)
        self.assertIn("status", status)
        self.assertEqual(status["agent_id"], "test-agent")
        self.assertEqual(status["region"], "us-west-2")
    
    def test_status_transitions(self):
        """Test agent status changes during task execution."""
        self.assertEqual(self.agent.status, "initialized")
        
        self.agent.delegate_task("test_task", {})
        
        # After task completion, status should be idle
        self.assertEqual(self.agent.status, "idle")


if __name__ == "__main__":
    unittest.main()

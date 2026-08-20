"""Unit tests for Policy RAG Retrieval Engine."""
import unittest
from app.tools.policy_tools import search_policy_docs, read_policy_section, list_policy_sections


class TestPolicyRAG(unittest.TestCase):

    def test_sick_leave_mc_retrieval(self):
        result = search_policy_docs("sick leave medical certificate MC Singapore")
        self.assertIn("#sec-1.1", result)
        self.assertIn("medical practitioner", result.lower())

    def test_maternity_leave_retrieval(self):
        result = search_policy_docs("maternity leave entitlement Singapore")
        self.assertTrue("#sec-2.1" in result or "#sec-20.1" in result)
        self.assertIn("16 weeks", result)

    def test_direct_section_lookup(self):
        result = read_policy_section("1.1")
        self.assertIn("Section 1.1", result)
        self.assertIn("#sec-1.1", result)

    def test_out_of_domain_query_containment(self):
        result = search_policy_docs("office pet iguana animal rules")
        # Should contain notice regarding pet loss / no pets in policy
        self.assertTrue(
            "pet loss" in result.lower() or "outside our documented hr policies" in result.lower()
        )

    def test_list_policy_sections(self):
        toc = list_policy_sections()
        self.assertIn("Table of Contents", toc)
        self.assertIn("Section 1.1", toc)


if __name__ == "__main__":
    unittest.main()

import requests
import sys
from datetime import datetime, timedelta
import json

class TurkishAccountingAPITester:
    def __init__(self, base_url="https://cari-takip-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_customer_id = None
        self.created_payment_id = None
        self.created_transaction_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login with admin credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            expected_fields = ['total_receivable', 'total_payable', 'total_customers', 'cash_balance', 'pos_balance', 'total_balance']
            for field in expected_fields:
                if field not in response:
                    print(f"   Warning: Missing field {field}")
                else:
                    print(f"   {field}: {response[field]}")
        return success

    def test_customers_crud(self):
        """Test customer CRUD operations"""
        # Create customer
        customer_data = {
            "name": "Test Müşteri",
            "phone": "0555 123 45 67",
            "address": "Test Adres",
            "tax_number": "1234567890",
            "notes": "Test notu"
        }
        
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        
        if success and 'id' in response:
            self.created_customer_id = response['id']
            print(f"   Created customer ID: {self.created_customer_id}")
        
        # Get all customers
        success, response = self.run_test(
            "Get All Customers",
            "GET",
            "customers",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} customers")
        
        # Update customer if we created one
        if self.created_customer_id:
            update_data = {
                "name": "Updated Test Müşteri",
                "phone": "0555 999 88 77",
                "address": "Updated Adres",
                "tax_number": "9876543210",
                "notes": "Updated note"
            }
            
            success, response = self.run_test(
                "Update Customer",
                "PUT",
                f"customers/{self.created_customer_id}",
                200,
                data=update_data
            )
        
        return success

    def test_payments_crud(self):
        """Test payment CRUD operations"""
        if not self.created_customer_id:
            print("❌ Cannot test payments without customer ID")
            return False
        
        # Create payment
        due_date = (datetime.now() + timedelta(days=30)).isoformat()
        payment_data = {
            "customer_id": self.created_customer_id,
            "customer_name": "Test Müşteri",
            "amount": 1500.50,
            "payment_type": "alacak",
            "is_paid": False,
            "due_date": due_date,
            "description": "Test ödeme"
        }
        
        success, response = self.run_test(
            "Create Payment",
            "POST",
            "payments",
            200,
            data=payment_data
        )
        
        if success and 'id' in response:
            self.created_payment_id = response['id']
            print(f"   Created payment ID: {self.created_payment_id}")
        
        # Get all payments
        success, response = self.run_test(
            "Get All Payments",
            "GET",
            "payments",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} payments")
        
        # Update payment if we created one
        if self.created_payment_id:
            update_data = {
                "customer_id": self.created_customer_id,
                "customer_name": "Test Müşteri",
                "amount": 2000.00,
                "payment_type": "borc",
                "is_paid": True,
                "payment_date": datetime.now().isoformat(),
                "due_date": due_date,
                "description": "Updated test ödeme"
            }
            
            success, response = self.run_test(
                "Update Payment",
                "PUT",
                f"payments/{self.created_payment_id}",
                200,
                data=update_data
            )
        
        return success

    def test_transactions_crud(self):
        """Test transaction CRUD operations"""
        # Create transaction
        transaction_data = {
            "type": "gelir",
            "payment_method": "nakit",
            "amount": 500.00,
            "description": "Test gelir",
            "transaction_date": datetime.now().isoformat()
        }
        
        success, response = self.run_test(
            "Create Transaction",
            "POST",
            "transactions",
            200,
            data=transaction_data
        )
        
        if success and 'id' in response:
            self.created_transaction_id = response['id']
            print(f"   Created transaction ID: {self.created_transaction_id}")
        
        # Get all transactions
        success, response = self.run_test(
            "Get All Transactions",
            "GET",
            "transactions",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} transactions")
        
        return success

    def test_reports_export(self):
        """Test Excel export functionality"""
        report_types = ["customers", "payments", "transactions"]
        
        for report_type in report_types:
            success, _ = self.run_test(
                f"Export {report_type.title()} Report",
                "GET",
                f"reports/export?report_type={report_type}",
                200
            )
            if not success:
                return False
        
        return True

    def test_change_password(self):
        """Test password change functionality"""
        password_data = {
            "username": "admin",
            "old_password": "admin123",
            "new_password": "newpass123"
        }
        
        success, response = self.run_test(
            "Change Password",
            "POST",
            "auth/change-password",
            200,
            data=password_data
        )
        
        if success:
            # Change it back
            revert_data = {
                "username": "admin",
                "old_password": "newpass123",
                "new_password": "admin123"
            }
            
            success, response = self.run_test(
                "Revert Password",
                "POST",
                "auth/change-password",
                200,
                data=revert_data
            )
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.created_payment_id:
            self.run_test(
                "Delete Test Payment",
                "DELETE",
                f"payments/{self.created_payment_id}",
                200
            )
        
        if self.created_transaction_id:
            self.run_test(
                "Delete Test Transaction",
                "DELETE",
                f"transactions/{self.created_transaction_id}",
                200
            )
        
        if self.created_customer_id:
            self.run_test(
                "Delete Test Customer",
                "DELETE",
                f"customers/{self.created_customer_id}",
                200
            )

def main():
    print("🚀 Starting Turkish Accounting API Tests...")
    print("=" * 50)
    
    tester = TurkishAccountingAPITester()
    
    # Test login first
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1
    
    # Run all tests
    test_results = []
    
    test_results.append(("Dashboard Stats", tester.test_dashboard_stats()))
    test_results.append(("Customers CRUD", tester.test_customers_crud()))
    test_results.append(("Payments CRUD", tester.test_payments_crud()))
    test_results.append(("Transactions CRUD", tester.test_transactions_crud()))
    test_results.append(("Reports Export", tester.test_reports_export()))
    test_results.append(("Change Password", tester.test_change_password()))
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS:")
    print("=" * 50)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:<20} {status}")
    
    print(f"\n📈 Overall: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"🎯 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())
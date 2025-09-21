#![allow(non_snake_case)]

use multiversx_sc::types::{Address, ManagedBuffer};
use multiversx_sc_scenario::*;

const OWNER_ADDRESS_EXPR: &str = "address:owner";
const USER_ADDRESS_EXPR: &str = "address:user";
const CONTRACT_ADDRESS_EXPR: &str = "sc:onchain-proof";
const CODE_PATH: &str = "output/onchain-proof.wasm";

fn world() -> ScenarioWorld {
    let mut blockchain = ScenarioWorld::new();
    blockchain.set_current_dir_from_workspace("contract");
    
    blockchain.register_contract(CODE_PATH, onchain_proof::ContractBuilder);
    blockchain
}

#[test]
fn init_test() {
    let mut world = world();
    
    world.run("scenarios/init.scen.json");
}

#[test]
fn certify_action_test() {
    let mut world = world();
    
    world
        .start_trace()
        .set_state_step(
            SetStateStep::new()
                .put_account(OWNER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account(USER_ADDRESS_EXPR, Account::new().nonce(1))
                .new_address(OWNER_ADDRESS_EXPR, 1, CONTRACT_ADDRESS_EXPR),
        )
        .sc_deploy(
            ScDeployStep::new()
                .from(OWNER_ADDRESS_EXPR)
                .contract_code(CODE_PATH, "")
                .call(onchain_proof::contract_obj::<DebugApi>().init()),
        )
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"Test Certificate"),
                    ManagedBuffer::from(b"TEST_CERT_001"),
                    OptionalValue::None,
                )),
        )
        .check_state_step(
            CheckStateStep::new()
                .put_account(
                    USER_ADDRESS_EXPR,
                    CheckAccount::new(),
                )
                .put_account(
                    CONTRACT_ADDRESS_EXPR,
                    CheckAccount::new()
                        .check_storage("str:userProofs|address:user|str:TEST_CERT_001", "*")
                        .check_storage("str:userProofIds|address:user", "*")
                        .check_storage("str:proofOwners|str:TEST_CERT_001", "address:user")
                        .check_storage("str:totalProofs", "1")
                        .check_storage("str:userProofCount|address:user", "1"),
                ),
        );
}

#[test]
fn get_proof_test() {
    let mut world = world();
    
    world
        .start_trace()
        .set_state_step(
            SetStateStep::new()
                .put_account(OWNER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account(USER_ADDRESS_EXPR, Account::new().nonce(1))
                .new_address(OWNER_ADDRESS_EXPR, 1, CONTRACT_ADDRESS_EXPR),
        )
        .sc_deploy(
            ScDeployStep::new()
                .from(OWNER_ADDRESS_EXPR)
                .contract_code(CODE_PATH, "")
                .call(onchain_proof::contract_obj::<DebugApi>().init()),
        )
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"Test Certificate"),
                    ManagedBuffer::from(b"TEST_CERT_001"),
                    OptionalValue::Some(ManagedBuffer::from(b"test metadata")),
                )),
        )
        .sc_query(
            ScQueryStep::new()
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().get_proof(
                    &managed_address!(&address_expr_to_address(USER_ADDRESS_EXPR)),
                    &ManagedBuffer::from(b"TEST_CERT_001"),
                ))
                .expect(TxExpect::ok()),
        );
}

#[test]
fn multiple_proofs_test() {
    let mut world = world();
    
    world
        .start_trace()
        .set_state_step(
            SetStateStep::new()
                .put_account(OWNER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account(USER_ADDRESS_EXPR, Account::new().nonce(1))
                .new_address(OWNER_ADDRESS_EXPR, 1, CONTRACT_ADDRESS_EXPR),
        )
        .sc_deploy(
            ScDeployStep::new()
                .from(OWNER_ADDRESS_EXPR)
                .contract_code(CODE_PATH, "")
                .call(onchain_proof::contract_obj::<DebugApi>().init()),
        )
        // First proof
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"First Certificate"),
                    ManagedBuffer::from(b"CERT_001"),
                    OptionalValue::None,
                )),
        )
        // Second proof
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"Second Certificate"),
                    ManagedBuffer::from(b"CERT_002"),
                    OptionalValue::None,
                )),
        )
        .check_state_step(
            CheckStateStep::new()
                .put_account(
                    CONTRACT_ADDRESS_EXPR,
                    CheckAccount::new()
                        .check_storage("str:totalProofs", "2")
                        .check_storage("str:userProofCount|address:user", "2"),
                ),
        );
}

#[test]
fn duplicate_proof_id_test() {
    let mut world = world();
    
    world
        .start_trace()
        .set_state_step(
            SetStateStep::new()
                .put_account(OWNER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account(USER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account("address:user2", Account::new().nonce(1))
                .new_address(OWNER_ADDRESS_EXPR, 1, CONTRACT_ADDRESS_EXPR),
        )
        .sc_deploy(
            ScDeployStep::new()
                .from(OWNER_ADDRESS_EXPR)
                .contract_code(CODE_PATH, "")
                .call(onchain_proof::contract_obj::<DebugApi>().init()),
        )
        // First user creates proof
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"First Certificate"),
                    ManagedBuffer::from(b"DUPLICATE_ID"),
                    OptionalValue::None,
                )),
        )
        // Second user tries to use same proof ID - should fail
        .sc_call(
            ScCallStep::new()
                .from("address:user2")
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"Second Certificate"),
                    ManagedBuffer::from(b"DUPLICATE_ID"),
                    OptionalValue::None,
                ))
                .expect(TxExpect::user_error("str:Proof ID already exists")),
        );
}

#[test]
fn update_proof_test() {
    let mut world = world();
    
    world
        .start_trace()
        .set_state_step(
            SetStateStep::new()
                .put_account(OWNER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account(USER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account("address:user2", Account::new().nonce(1))
                .new_address(OWNER_ADDRESS_EXPR, 1, CONTRACT_ADDRESS_EXPR),
        )
        .sc_deploy(
            ScDeployStep::new()
                .from(OWNER_ADDRESS_EXPR)
                .contract_code(CODE_PATH, "")
                .call(onchain_proof::contract_obj::<DebugApi>().init()),
        )
        // Create initial proof
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"Initial Certificate"),
                    ManagedBuffer::from(b"UPDATE_TEST"),
                    OptionalValue::None,
                )),
        )
        // Owner updates their proof
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().update_proof(
                    ManagedBuffer::from(b"UPDATE_TEST"),
                    ManagedBuffer::from(b"Updated Certificate"),
                    OptionalValue::Some(ManagedBuffer::from(b"new metadata")),
                )),
        )
        // Different user tries to update - should fail
        .sc_call(
            ScCallStep::new()
                .from("address:user2")
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().update_proof(
                    ManagedBuffer::from(b"UPDATE_TEST"),
                    ManagedBuffer::from(b"Malicious Update"),
                    OptionalValue::None,
                ))
                .expect(TxExpect::user_error("str:Only proof owner can update")),
        );
}

#[test]
fn proof_text_validation_test() {
    let mut world = world();
    
    world
        .start_trace()
        .set_state_step(
            SetStateStep::new()
                .put_account(OWNER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account(USER_ADDRESS_EXPR, Account::new().nonce(1))
                .new_address(OWNER_ADDRESS_EXPR, 1, CONTRACT_ADDRESS_EXPR),
        )
        .sc_deploy(
            ScDeployStep::new()
                .from(OWNER_ADDRESS_EXPR)
                .contract_code(CODE_PATH, "")
                .call(onchain_proof::contract_obj::<DebugApi>().init()),
        )
        // Test empty proof text - should fail
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b""),
                    ManagedBuffer::from(b"EMPTY_TEXT"),
                    OptionalValue::None,
                ))
                .expect(TxExpect::user_error("str:Proof text must be between 1 and 500 characters")),
        )
        // Test too long proof text - should fail
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(&[b'a'; 501]),
                    ManagedBuffer::from(b"TOO_LONG"),
                    OptionalValue::None,
                ))
                .expect(TxExpect::user_error("str:Proof text must be between 1 and 500 characters")),
        )
        // Test valid proof text - should succeed
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"Valid certificate text"),
                    ManagedBuffer::from(b"VALID_CERT"),
                    OptionalValue::None,
                )),
        );
}

#[test]
fn get_user_proofs_test() {
    let mut world = world();
    
    world
        .start_trace()
        .set_state_step(
            SetStateStep::new()
                .put_account(OWNER_ADDRESS_EXPR, Account::new().nonce(1))
                .put_account(USER_ADDRESS_EXPR, Account::new().nonce(1))
                .new_address(OWNER_ADDRESS_EXPR, 1, CONTRACT_ADDRESS_EXPR),
        )
        .sc_deploy(
            ScDeployStep::new()
                .from(OWNER_ADDRESS_EXPR)
                .contract_code(CODE_PATH, "")
                .call(onchain_proof::contract_obj::<DebugApi>().init()),
        )
        // Create multiple proofs
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"Certificate 1"),
                    ManagedBuffer::from(b"CERT_1"),
                    OptionalValue::None,
                )),
        )
        .sc_call(
            ScCallStep::new()
                .from(USER_ADDRESS_EXPR)
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().certify_action(
                    ManagedBuffer::from(b"Certificate 2"),
                    ManagedBuffer::from(b"CERT_2"),
                    OptionalValue::None,
                )),
        )
        // Query all user proofs
        .sc_query(
            ScQueryStep::new()
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().get_user_proofs(
                    &managed_address!(&address_expr_to_address(USER_ADDRESS_EXPR)),
                ))
                .expect(TxExpect::ok()),
        )
        // Query user proof IDs
        .sc_query(
            ScQueryStep::new()
                .to(CONTRACT_ADDRESS_EXPR)
                .call(onchain_proof::contract_obj::<DebugApi>().get_user_proof_ids(
                    &managed_address!(&address_expr_to_address(USER_ADDRESS_EXPR)),
                ))
                .expect(TxExpect::ok()),
        );
}
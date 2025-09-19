use multiversx_sc_scenario::*;
use onchain_proof::*;

const CONTRACT_WASM_PATH: &str = "output/onchain-proof.wasm";

#[test]
fn test_full_proof_lifecycle() {
    let mut blockchain = BlockchainStateWrapper::new();
    let user_address = blockchain.create_user_account(&rust_biguint!(1000));
    let contract_wrapper = blockchain.create_sc_account(
        &rust_biguint!(0),
        None,
        onchain_proof::contract_obj,
        CONTRACT_WASM_PATH,
    );

    // Deploy contract
    blockchain
        .execute_tx(&contract_wrapper.user_account, &contract_wrapper, &rust_biguint!(0), |sc| {
            sc.init();
        })
        .assert_ok();

    let proof_text = managed_buffer!(b"HACKATHON_2025_WINNER");
    let proof_id = managed_buffer!(b"hackathon_001");
    let metadata = managed_buffer!(b"{\"event\": \"MultiversX Hackathon\", \"date\": \"2025-09-19\"}");
    let updated_text = managed_buffer!(b"HACKATHON_2025_WINNER_VERIFIED");

    // Step 1: Create proof
    blockchain
        .execute_tx(&user_address, &contract_wrapper, &rust_biguint!(0), |sc| {
            sc.certify_action(
                proof_text.clone(),
                proof_id.clone(),
                OptionalValue::Some(metadata.clone()),
            );
        })
        .assert_ok();

    // Step 2: Verify proof exists
    blockchain
        .execute_query(&contract_wrapper, |sc| {
            assert!(sc.proof_exists(&proof_id));
            
            let owner = sc.get_proof_owner(&proof_id).into_option().unwrap();
            assert_eq!(owner, managed_address!(&user_address));
        })
        .assert_ok();

    // Step 3: Update proof
    blockchain
        .execute_tx(&user_address, &contract_wrapper, &rust_biguint!(0), |sc| {
            sc.update_proof(
                proof_id.clone(),
                updated_text.clone(),
                OptionalValue::None,
            );
        })
        .assert_ok();

    // Step 4: Verify update
    blockchain
        .execute_query(&contract_wrapper, |sc| {
            let result = sc.get_proof(&managed_address!(&user_address), &proof_id);
            let proof_data = result.into_option().unwrap();
            assert_eq!(proof_data.proof_text, updated_text);
            assert_eq!(proof_data.metadata, metadata);
        })
        .assert_ok();

    // Step 5: Check user stats
    blockchain
        .execute_query(&contract_wrapper, |sc| {
            let user_count = sc.get_user_proof_count(&managed_address!(&user_address));
            assert_eq!(user_count, 1);
            
            let total_count = sc.get_total_proofs();
            assert_eq!(total_count, 1);
        })
        .assert_ok();
}

#[test]
fn test_multiple_users_scenario() {
    let mut blockchain = BlockchainStateWrapper::new();
    let alice = blockchain.create_user_account(&rust_biguint!(1000));
    let bob = blockchain.create_user_account(&rust_biguint!(1000));
    let charlie = blockchain.create_user_account(&rust_biguint!(1000));
    
    let contract_wrapper = blockchain.create_sc_account(
        &rust_biguint!(0),
        None,
        onchain_proof::contract_obj,
        CONTRACT_WASM_PATH,
    );

    blockchain
        .execute_tx(&contract_wrapper.user_account, &contract_wrapper, &rust_biguint!(0), |sc| {
            sc.init();
        })
        .assert_ok();

    // Alice creates 2 proofs
    for i in 1..=2 {
        blockchain
            .execute_tx(&alice, &contract_wrapper, &rust_biguint!(0), |sc| {
                sc.certify_action(
                    managed_buffer!(format!("ALICE_PROOF_{}", i).as_bytes()),
                    managed_buffer!(format!("alice_proof_{}", i).as_bytes()),
                    OptionalValue::None,
                );
            })
            .assert_ok();
    }

    // Bob creates 1 proof
    blockchain
        .execute_tx(&bob, &contract_wrapper, &rust_biguint!(0), |sc| {
            sc.certify_action(
                managed_buffer!(b"BOB_CERTIFICATE"),
                managed_buffer!(b"bob_cert_1"),
                OptionalValue::Some(managed_buffer!(b"{\"grade\": \"A+\"}")))
            );
        })
        .assert_ok();

    // Charlie creates 3 proofs
    for i in 1..=3 {
        blockchain
            .execute_tx(&charlie, &contract_wrapper, &rust_biguint!(0), |sc| {
                sc.certify_action(
                    managed_buffer!(format!("CHARLIE_BADGE_{}", i).as_bytes()),
                    managed_buffer!(format!("charlie_badge_{}", i).as_bytes()),
                    OptionalValue::None,
                );
            })
            .assert_ok();
    }

    // Verify individual user counts
    blockchain
        .execute_query(&contract_wrapper, |sc| {
            assert_eq!(sc.get_user_proof_count(&managed_address!(&alice)), 2);
            assert_eq!(sc.get_user_proof_count(&managed_address!(&bob)), 1);
            assert_eq!(sc.get_user_proof_count(&managed_address!(&charlie)), 3);
            
            assert_eq!(sc.get_total_proofs(), 6);
        })
        .assert_ok();
}

#[test] 
fn test_proof_verification_workflow() {
    let mut blockchain = BlockchainStateWrapper::new();
    let issuer = blockchain.create_user_account(&rust_biguint!(1000));
    
    let contract_wrapper = blockchain.create_sc_account(
        &rust_biguint!(0),
        None,
        onchain_proof::contract_obj,
        CONTRACT_WASM_PATH,
    );

    blockchain
        .execute_tx(&contract_wrapper.user_account, &contract_wrapper, &rust_biguint!(0), |sc| {
            sc.init();
        })
        .assert_ok();

    let proof_text = managed_buffer!(b"BLOCKCHAIN_DEVELOPER_CERTIFICATE");
    let proof_id = managed_buffer!(b"dev_cert_2025_001");
    let metadata = managed_buffer!(b"{\"institution\": \"TechUniversity\", \"score\": 98}");

    // Create certificate
    blockchain
        .execute_tx(&issuer, &contract_wrapper, &rust_biguint!(0), |sc| {
            sc.certify_action(
                proof_text.clone(),
                proof_id.clone(),
                OptionalValue::Some(metadata.clone()),
            );
        })
        .assert_ok();

    // Verify proof exists and can be queried
    blockchain
        .execute_query(&contract_wrapper, |sc| {
            assert!(sc.proof_exists(&proof_id));
            
            let owner = sc.get_proof_owner(&proof_id).into_option().unwrap();
            assert_eq!(owner, managed_address!(&issuer));
            
            let proof_data = sc.get_proof(&managed_address!(&issuer), &proof_id).into_option().unwrap();
            assert_eq!(proof_data.proof_text, proof_text);
            assert_eq!(proof_data.metadata, metadata);
            assert!(proof_data.timestamp > 0);
        })
        .assert_ok();
}
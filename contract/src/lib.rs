#![no_std]

multiversx_sc::imports!();

#[derive(TypeAbi, TopEncode, TopDecode, PartialEq, Debug, Clone)]
pub struct ProofData<M: ManagedTypeApi> {
    pub proof_text: ManagedBuffer<M>,
    pub timestamp: u64,
    pub proof_id: ManagedBuffer<M>,
    pub metadata: ManagedBuffer<M>,
}

#[multiversx_sc::contract]
pub trait OnChainProof {
    #[init]
    fn init(&self) {}

    #[upgrade]
    fn upgrade(&self) {}

    // Storage pentru dovezi multiple per utilizator
    #[storage_mapper("userProofs")]
    fn user_proofs(&self, user: &ManagedAddress, proof_id: &ManagedBuffer) -> SingleValueMapper<ProofData<Self::Api>>;

    // Lista cu toate proof_id-urile unui utilizator
    #[storage_mapper("userProofIds")]
    fn user_proof_ids(&self, user: &ManagedAddress) -> UnorderedSetMapper<ManagedBuffer>;

    // Contor pentru proof-uri totale
    #[storage_mapper("totalProofs")]
    fn total_proofs(&self) -> SingleValueMapper<u64>;

    // Contor proof-uri per utilizator
    #[storage_mapper("userProofCount")]
    fn user_proof_count(&self, user: &ManagedAddress) -> SingleValueMapper<u64>;

    // Mapare globala proof_id -> user (pentru search)
    #[storage_mapper("proofOwners")]
    fn proof_owners(&self, proof_id: &ManagedBuffer) -> SingleValueMapper<ManagedAddress>;

    #[endpoint]
    fn certify_action(&self, proof_text: ManagedBuffer, proof_id: ManagedBuffer, metadata: OptionalValue<ManagedBuffer>) {
        let caller = self.blockchain().get_caller();
        let current_timestamp = self.blockchain().get_block_timestamp();
        
        // Verifică dacă proof_id este unic
        require!(
            self.proof_owners(&proof_id).is_empty(),
            "Proof ID already exists"
        );
        
        // Verifică lungimea proof_text
        require!(
            proof_text.len() > 0 && proof_text.len() <= 500,
            "Proof text must be between 1 and 500 characters"
        );
        
        let metadata_buffer = match metadata {
            OptionalValue::Some(meta) => meta,
            OptionalValue::None => ManagedBuffer::new(),
        };
        
        let proof_data = ProofData {
            proof_text: proof_text.clone(),
            timestamp: current_timestamp,
            proof_id: proof_id.clone(),
            metadata: metadata_buffer,
        };
        
        // Salvează dovada
        self.user_proofs(&caller, &proof_id).set(proof_data);
        
        // Adaugă proof_id în lista utilizatorului
        self.user_proof_ids(&caller).insert(proof_id.clone());
        
        // Mapează proof_id la owner
        self.proof_owners(&proof_id).set(caller.clone());
        
        // Incrementează contoarele
        let current_count = self.user_proof_count(&caller).get();
        self.user_proof_count(&caller).set(current_count + 1);
        
        let total = self.total_proofs().get();
        self.total_proofs().set(total + 1);
        
        // Emit event
        self.proof_certified_event(&caller, &proof_id, &proof_text, current_timestamp);
    }
    
    #[endpoint]
    fn update_proof(&self, proof_id: ManagedBuffer, new_proof_text: ManagedBuffer, new_metadata: OptionalValue<ManagedBuffer>) {
        let caller = self.blockchain().get_caller();
        
        // Verifică ownership
        let owner = self.proof_owners(&proof_id).get();
        require!(
            owner == caller,
            "Only proof owner can update"
        );
        
        require!(
            new_proof_text.len() > 0 && new_proof_text.len() <= 500,
            "Proof text must be between 1 and 500 characters"
        );
        
        let mut proof_data = self.user_proofs(&caller, &proof_id).get();
        proof_data.proof_text = new_proof_text.clone();
        
        if let OptionalValue::Some(metadata) = new_metadata {
            proof_data.metadata = metadata;
        }
        
        self.user_proofs(&caller, &proof_id).set(proof_data);
        
        // Emit update event
        self.proof_updated_event(&caller, &proof_id, &new_proof_text);
    }

    #[view(getProof)]
    fn get_proof(&self, user: &ManagedAddress, proof_id: &ManagedBuffer) -> OptionalValue<ProofData<Self::Api>> {
        if self.user_proofs(user, proof_id).is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.user_proofs(user, proof_id).get())
        }
    }
    
    #[view(getUserProofs)]
    fn get_user_proofs(&self, user: &ManagedAddress) -> MultiValueEncoded<ProofData<Self::Api>> {
        let mut result = MultiValueEncoded::new();
        
        for proof_id in self.user_proof_ids(user).iter() {
            let proof_data = self.user_proofs(user, &proof_id).get();
            result.push(proof_data);
        }
        
        result
    }
    
    #[view(getUserProofIds)]
    fn get_user_proof_ids(&self, user: &ManagedAddress) -> MultiValueEncoded<ManagedBuffer> {
        let mut result = MultiValueEncoded::new();
        
        for proof_id in self.user_proof_ids(user).iter() {
            result.push(proof_id);
        }
        
        result
    }
    
    #[view(getProofOwner)]
    fn get_proof_owner(&self, proof_id: &ManagedBuffer) -> OptionalValue<ManagedAddress> {
        if self.proof_owners(proof_id).is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.proof_owners(proof_id).get())
        }
    }
    
    #[view(getUserProofCount)]
    fn get_user_proof_count(&self, user: &ManagedAddress) -> u64 {
        self.user_proof_count(user).get()
    }
    
    #[view(getTotalProofs)]
    fn get_total_proofs(&self) -> u64 {
        self.total_proofs().get()
    }
    
    #[view(proofExists)]
    fn proof_exists(&self, proof_id: &ManagedBuffer) -> bool {
        !self.proof_owners(proof_id).is_empty()
    }

    // Events
    #[event("proofCertified")]
    fn proof_certified_event(
        &self,
        #[indexed] user: &ManagedAddress,
        #[indexed] proof_id: &ManagedBuffer,
        proof_text: &ManagedBuffer,
        timestamp: u64,
    );
    
    #[event("proofUpdated")]
    fn proof_updated_event(
        &self,
        #[indexed] user: &ManagedAddress,
        #[indexed] proof_id: &ManagedBuffer,
        new_proof_text: &ManagedBuffer,
    );
}
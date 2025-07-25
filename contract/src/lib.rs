#![no_std]

multiversx_sc::contract! {
    pub trait OnChainProof {
        #[storage_mapper("userProofs")]
        fn proofs(&self, user: &ManagedAddress) -> SingleValueMapper<ManagedBuffer>;

        #[endpoint]
        fn certifyAction(&self, proof: ManagedBuffer) {
            let caller = self.blockchain().get_caller();
            self.proofs(&caller).set(proof);
        }

        #[view(getProof)]
        fn get_proof(&self, user: &ManagedAddress) -> ManagedBuffer {
            self.proofs(user).get()
        }
    }
}

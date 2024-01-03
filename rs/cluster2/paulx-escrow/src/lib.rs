// inside lib.rs, only the following line should be in here

//#[cfg(not(feature = "no-entrypoint"))]
pub mod entrypoint;

pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;

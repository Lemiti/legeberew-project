// build.rs
fn main() {
    uniffi::generate_scaffolding("./src/legeberew.udl").expect("Building the UDL file failed");
}

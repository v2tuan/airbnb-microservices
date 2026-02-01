package com.identityservice.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper=true)
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Role extends BaseEntity{

    @Id
    String name;

    String description;

    @ManyToMany(mappedBy = "roles")
    List<Account> accountList;
}
